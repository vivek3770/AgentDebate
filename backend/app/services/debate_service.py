"""
AgentDebate Backend — Debate Orchestration Service

Manages the full debate lifecycle: running rounds, coordinating agents,
streaming events to WebSocket clients, and persisting results.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime
from typing import Optional

from fastapi import WebSocket

from app.agents.debater import generate_argument_stream
from app.agents.judge import judge_round, judge_verdict
from app.models.schemas import (
    AgentRole,
    DebateConfig,
    DebatePhase,
    DebateResult,
    DebateRound,
    DebateStatus,
    JudgeRoundScore,
    WSEvent,
    WSEventType,
)

logger = logging.getLogger(__name__)


# ──────────────── Active Debate Sessions ───────────────────────

_active_debates: dict[str, "DebateSession"] = {}


class DebateSession:
    """
    Manages a single debate session lifecycle.

    Coordinates the turn-based flow between debaters and judge,
    streaming events to connected WebSocket clients.
    """

    def __init__(self, debate_id: str, config: DebateConfig):
        self.debate_id = debate_id
        self.config = config
        self.status = DebateStatus.PENDING
        self.rounds: list[DebateRound] = []
        self.round_scores: list[JudgeRoundScore] = []
        self.result: Optional[DebateResult] = None
        self.websockets: list[WebSocket] = []
        self._paused = asyncio.Event()
        self._paused.set()  # Not paused initially
        self._stopped = False
        self._start_time: Optional[float] = None

    def add_websocket(self, ws: WebSocket):
        """Register a WebSocket client for event streaming."""
        self.websockets.append(ws)

    def remove_websocket(self, ws: WebSocket):
        """Unregister a WebSocket client."""
        if ws in self.websockets:
            self.websockets.remove(ws)

    async def broadcast(self, event: WSEvent):
        """Send an event to all connected WebSocket clients."""
        message = event.model_dump_json()
        disconnected = []
        for ws in self.websockets:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.remove_websocket(ws)

    def pause(self):
        """Pause the debate."""
        self._paused.clear()
        self.status = DebateStatus.PAUSED

    def resume(self):
        """Resume a paused debate."""
        self._paused.set()
        self.status = DebateStatus.RUNNING

    def stop(self):
        """Stop the debate."""
        self._stopped = True
        self._paused.set()  # Unblock if paused

    async def run(self):
        """
        Execute the full debate flow:
        For each round: Debater A → Debater B → Judge scores
        After all rounds: Final verdict
        """
        self._start_time = time.time()
        self.status = DebateStatus.RUNNING

        phases = self.config.round_structure

        # Notify: debate started
        await self.broadcast(WSEvent(
            type=WSEventType.DEBATE_STARTED,
            data={
                "debate_id": self.debate_id,
                "topic": self.config.topic,
                "rounds": self.config.num_rounds,
                "phases": [p.value for p in phases],
                "debater_a_model": self.config.debater_a_model,
                "debater_b_model": self.config.debater_b_model,
                "judge_model": self.config.judge_model,
                "debater_a_name": self.config.debater_a_name,
                "debater_b_name": self.config.debater_b_name,
            },
        ))

        try:
            for round_idx, phase in enumerate(phases, start=1):
                if self._stopped:
                    break

                # Wait if paused
                await self._paused.wait()

                current_round = DebateRound(
                    round_number=round_idx,
                    phase=phase,
                )

                # Notify: round started
                await self.broadcast(WSEvent(
                    type=WSEventType.ROUND_STARTED,
                    data={"round": round_idx, "phase": phase.value},
                ))

                # ─── Debater A's turn ───
                debater_a_text = await self._run_debater_turn(
                    role=AgentRole.DEBATER_A,
                    model_id=self.config.debater_a_model,
                    phase=phase,
                    round_number=round_idx,
                )
                current_round.debater_a_argument = debater_a_text

                if self._stopped:
                    break

                await self._paused.wait()

                # ─── Debater B's turn ───
                # Add A's argument to history temporarily so B can see it
                self.rounds.append(current_round)

                debater_b_text = await self._run_debater_turn(
                    role=AgentRole.DEBATER_B,
                    model_id=self.config.debater_b_model,
                    phase=phase,
                    round_number=round_idx,
                )
                current_round.debater_b_argument = debater_b_text

                # Update the round in history with B's argument
                self.rounds[-1] = current_round

                if self._stopped:
                    break

                # ─── Judge scores the round ───
                await self.broadcast(WSEvent(
                    type=WSEventType.JUDGE_OBSERVATION,
                    data={"text": f"Evaluating Round {round_idx}..."},
                ))

                round_score = await judge_round(
                    topic=self.config.topic,
                    round_number=round_idx,
                    phase=phase.value,
                    debater_a_argument=debater_a_text,
                    debater_b_argument=debater_b_text,
                    judge_model=self.config.judge_model,
                )

                current_round.judge_score = round_score
                self.round_scores.append(round_score)
                self.rounds[-1] = current_round

                # Notify: judge scoring
                await self.broadcast(WSEvent(
                    type=WSEventType.JUDGE_SCORING,
                    data={
                        "round": round_idx,
                        "scores": round_score.model_dump(),
                    },
                ))

                # Notify: round completed
                await self.broadcast(WSEvent(
                    type=WSEventType.ROUND_COMPLETED,
                    data={"round": round_idx},
                ))

            # ─── Final Verdict ───
            if not self._stopped and self.rounds:
                verdict = await judge_verdict(
                    topic=self.config.topic,
                    rounds=self.rounds,
                    round_scores=self.round_scores,
                    judge_model=self.config.judge_model,
                )

                duration = time.time() - self._start_time

                self.result = DebateResult(
                    debate_id=self.debate_id,
                    config=self.config,
                    rounds=self.rounds,
                    verdict=verdict,
                    status=DebateStatus.COMPLETED,
                    completed_at=datetime.utcnow(),
                    duration_seconds=round(duration, 2),
                )

                await self.broadcast(WSEvent(
                    type=WSEventType.VERDICT,
                    data=verdict.model_dump(),
                ))

                self.status = DebateStatus.COMPLETED

            await self.broadcast(WSEvent(
                type=WSEventType.DEBATE_COMPLETED,
                data={"debate_id": self.debate_id, "status": self.status.value},
            ))

        except Exception as e:
            logger.exception(f"Debate {self.debate_id} failed: {e}")
            self.status = DebateStatus.ERROR
            await self.broadcast(WSEvent(
                type=WSEventType.ERROR,
                data={"message": str(e)},
            ))

    async def _run_debater_turn(
        self,
        role: AgentRole,
        model_id: str,
        phase: DebatePhase,
        round_number: int,
    ) -> str:
        """Run a single debater's turn with streaming."""
        # Notify: turn started
        await self.broadcast(WSEvent(
            type=WSEventType.TURN_STARTED,
            data={"agent": role.value, "model": model_id},
        ))

        full_text = []

        async for token in generate_argument_stream(
            topic=self.config.topic,
            model_id=model_id,
            role=role,
            phase=phase,
            round_number=round_number,
            rounds_history=self.rounds[:-1] if role == AgentRole.DEBATER_B else self.rounds,
            max_tokens=self.config.max_tokens_per_turn,
        ):
            if self._stopped:
                break

            full_text.append(token)

            # Stream token to clients
            await self.broadcast(WSEvent(
                type=WSEventType.TOKEN_STREAM,
                data={"agent": role.value, "token": token},
            ))

        completed_text = "".join(full_text)

        # Notify: turn completed
        await self.broadcast(WSEvent(
            type=WSEventType.TURN_COMPLETED,
            data={"agent": role.value, "full_text": completed_text},
        ))

        return completed_text


# ──────────────── Session Management ───────────────────────────


def create_debate_session(config: DebateConfig) -> DebateSession:
    """Create and register a new debate session."""
    debate_id = str(uuid.uuid4())
    session = DebateSession(debate_id, config)
    _active_debates[debate_id] = session
    return session


def get_debate_session(debate_id: str) -> Optional[DebateSession]:
    """Get an active debate session by ID."""
    return _active_debates.get(debate_id)


def remove_debate_session(debate_id: str):
    """Remove a completed/stopped debate session from active sessions."""
    _active_debates.pop(debate_id, None)


def list_active_debates() -> list[str]:
    """List IDs of all active debate sessions."""
    return list(_active_debates.keys())
