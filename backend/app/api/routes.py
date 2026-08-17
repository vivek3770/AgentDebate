"""
AgentDebate Backend — REST API Routes

CRUD endpoints for debate management, model listing, and health checks.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import DebateRecord, get_db_session
from app.models.schemas import (
    CreateDebateResponse,
    DebateConfig,
    DebateListItem,
    DebateResult,
    DebateStatus,
    ModelInfo,
)
from app.services.debate_service import (
    create_debate_session,
    get_debate_session,
    list_active_debates,
)
from app.services.llm_service import get_llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["debates"])


# ──────────────────── Health Check ─────────────────────────────


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "AgentDebate API",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ──────────────────── Models ───────────────────────────────────


@router.get("/models", response_model=list[ModelInfo])
async def list_models():
    """List available LLM models."""
    llm = get_llm_service()
    models = llm.get_available_models()
    return [ModelInfo(**m) for m in models]


# ──────────────────── Debates ──────────────────────────────────


@router.post("/debates", response_model=CreateDebateResponse)
async def create_debate(config: DebateConfig):
    """
    Create a new debate session.
    Returns the debate ID for connecting via WebSocket.
    """
    session = create_debate_session(config)

    return CreateDebateResponse(
        debate_id=session.debate_id,
        status=DebateStatus.PENDING,
        message=f"Debate created. Connect to /ws/debate/{session.debate_id} to start.",
    )


@router.get("/debates")
async def list_debates(db: AsyncSession = Depends(get_db_session)):
    """List all past debates."""
    result = await db.execute(
        select(DebateRecord).order_by(desc(DebateRecord.created_at))
    )
    records = result.scalars().all()

    items = []
    for r in records:
        items.append(DebateListItem(
            debate_id=r.id,
            topic=r.topic,
            status=DebateStatus(r.status),
            winner=r.winner,
            debater_a_model=r.debater_a_model,
            debater_b_model=r.debater_b_model,
            created_at=r.created_at,
            duration_seconds=r.duration_seconds,
        ))

    # Also include active debates
    for debate_id in list_active_debates():
        session = get_debate_session(debate_id)
        if session and not any(i.debate_id == debate_id for i in items):
            items.insert(0, DebateListItem(
                debate_id=debate_id,
                topic=session.config.topic,
                status=session.status,
                winner=None,
                debater_a_model=session.config.debater_a_model,
                debater_b_model=session.config.debater_b_model,
                created_at=datetime.utcnow(),
                duration_seconds=None,
            ))

    return items


@router.get("/debates/{debate_id}")
async def get_debate(debate_id: str, db: AsyncSession = Depends(get_db_session)):
    """Get full debate details including transcript."""
    # Check active sessions first
    session = get_debate_session(debate_id)
    if session and session.result:
        return session.result.model_dump()

    # Check database
    record = await db.get(DebateRecord, debate_id)
    if not record:
        raise HTTPException(status_code=404, detail="Debate not found")

    return {
        "debate_id": record.id,
        "topic": record.topic,
        "status": record.status,
        "winner": record.winner,
        "debater_a_model": record.debater_a_model,
        "debater_b_model": record.debater_b_model,
        "debater_a_name": record.debater_a_name,
        "debater_b_name": record.debater_b_name,
        "num_rounds": record.num_rounds,
        "rounds": record.rounds_data,
        "verdict": record.verdict_data,
        "config": record.config_data,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        "duration_seconds": record.duration_seconds,
    }


@router.delete("/debates/{debate_id}")
async def delete_debate(debate_id: str, db: AsyncSession = Depends(get_db_session)):
    """Delete a debate record."""
    record = await db.get(DebateRecord, debate_id)
    if not record:
        raise HTTPException(status_code=404, detail="Debate not found")

    await db.delete(record)
    await db.commit()
    return {"message": "Debate deleted", "debate_id": debate_id}
