"""
AgentDebate Backend — Database Models & Setup

SQLAlchemy models for persisting debate history to SQLite.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, JSON, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""
    pass


class DebateRecord(Base):
    """Persisted debate record."""
    __tablename__ = "debates"

    id = Column(String, primary_key=True)
    topic = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    debater_a_model = Column(String(200), nullable=False)
    debater_b_model = Column(String(200), nullable=False)
    judge_model = Column(String(200), nullable=False)
    debater_a_name = Column(String(100), default="Debater A (Pro)")
    debater_b_name = Column(String(100), default="Debater B (Con)")
    num_rounds = Column(Integer, default=3)
    max_tokens_per_turn = Column(Integer, default=1024)
    winner = Column(String(20), nullable=True)

    # Store full debate data as JSON
    rounds_data = Column(JSON, default=list)
    verdict_data = Column(JSON, nullable=True)
    config_data = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)


# ──────────────── Async Engine & Session ───────────────────────

_engine = None
_session_factory = None


async def init_db():
    """Initialize the database and create tables."""
    global _engine, _session_factory
    settings = get_settings()
    _engine = create_async_engine(settings.database_url, echo=settings.debug)
    _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db_session() -> AsyncSession:
    """Get an async database session."""
    if _session_factory is None:
        await init_db()
    async with _session_factory() as session:
        yield session


async def close_db():
    """Close the database connection."""
    global _engine
    if _engine:
        await _engine.dispose()
