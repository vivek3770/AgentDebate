"""
AgentDebate Backend — WebSocket Handler

Handles WebSocket connections for real-time debate streaming.
Clients connect, send start/pause/resume/stop commands, and
receive streaming debate events.
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.models.schemas import DebateConfig, WSEvent, WSEventType
from app.services.debate_service import (
    create_debate_session,
    get_debate_session,
    remove_debate_session,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/debate/{debate_id}")
async def debate_websocket(websocket: WebSocket, debate_id: str):
    """
    WebSocket endpoint for real-time debate streaming.

    Protocol:
    1. Client connects to /ws/debate/{debate_id}
    2. Client sends {"type": "start_debate", "data": {"config": {...}}} to begin
    3. Server streams events (turn_started, token_stream, judge_scoring, etc.)
    4. Client can send pause/resume/stop commands
    5. Server sends debate_completed when done
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for debate {debate_id}")

    session = get_debate_session(debate_id)
    debate_task: asyncio.Task | None = None

    try:
        # If session exists, attach to it; otherwise wait for start command
        if session:
            session.add_websocket(websocket)

        while True:
            try:
                raw = await websocket.receive_text()
                message = json.loads(raw)
                msg_type = message.get("type", "")
                msg_data = message.get("data", {})

                if msg_type == WSEventType.START_DEBATE.value:
                    # Create or reuse debate session
                    config_data = msg_data.get("config", {})
                    config = DebateConfig(**config_data)

                    session = create_debate_session(config)
                    # Override the auto-generated ID with the URL-provided one
                    # if we want deterministic IDs. For now, use the session's ID.
                    session.debate_id = debate_id
                    session.add_websocket(websocket)

                    # Run debate in background task
                    debate_task = asyncio.create_task(session.run())
                    logger.info(f"Debate {debate_id} started")

                elif msg_type == WSEventType.PAUSE_DEBATE.value:
                    if session:
                        session.pause()
                        await websocket.send_text(WSEvent(
                            type=WSEventType.JUDGE_OBSERVATION,
                            data={"text": "Debate paused."},
                        ).model_dump_json())

                elif msg_type == WSEventType.RESUME_DEBATE.value:
                    if session:
                        session.resume()
                        await websocket.send_text(WSEvent(
                            type=WSEventType.JUDGE_OBSERVATION,
                            data={"text": "Debate resumed."},
                        ).model_dump_json())

                elif msg_type == WSEventType.STOP_DEBATE.value:
                    if session:
                        session.stop()
                        await websocket.send_text(WSEvent(
                            type=WSEventType.DEBATE_COMPLETED,
                            data={"debate_id": debate_id, "status": "stopped"},
                        ).model_dump_json())

            except WebSocketDisconnect:
                raise
            except json.JSONDecodeError:
                await websocket.send_text(WSEvent(
                    type=WSEventType.ERROR,
                    data={"message": "Invalid JSON message"},
                ).model_dump_json())
            except Exception as e:
                logger.error(f"WebSocket message error: {e}")
                await websocket.send_text(WSEvent(
                    type=WSEventType.ERROR,
                    data={"message": str(e)},
                ).model_dump_json())

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for debate {debate_id}")
    finally:
        if session:
            session.remove_websocket(websocket)
        # Don't cancel the debate task — it should continue running
        # for other connected clients
