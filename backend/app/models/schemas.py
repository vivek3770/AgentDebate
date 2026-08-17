"""
AgentDebate Backend — Pydantic Schemas

Defines all data models for the debate system: configuration, rounds, scoring, and verdicts.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ──────────────────────────── Enums ────────────────────────────


class DebatePhase(str, Enum):
    """Phases within a debate round."""
    OPENING = "opening"
    REBUTTAL = "rebuttal"
    CLOSING = "closing"


class DebateStatus(str, Enum):
    """Overall debate status."""
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class AgentRole(str, Enum):
    """Agent roles in the debate."""
    DEBATER_A = "debater_a"
    DEBATER_B = "debater_b"
    JUDGE = "judge"


class WinnerChoice(str, Enum):
    """Possible verdict outcomes."""
    DEBATER_A = "debater_a"
    DEBATER_B = "debater_b"
    DRAW = "draw"


# ──────────────────────── Configuration ────────────────────────


class DebateConfig(BaseModel):
    """User-submitted debate configuration."""
    topic: str = Field(..., min_length=5, max_length=500, description="The debate resolution/topic")
    debater_a_model: str = Field(default="Qwen/Qwen3.8-2.4T-A95B", description="Model for Debater A (Pro)")
    debater_b_model: str = Field(default="deepseek-ai/DeepSeek-V4-Pro-0813", description="Model for Debater B (Con)")
    judge_model: str = Field(default="gemini-2.5-flash", description="Model for the Judge")
    num_rounds: int = Field(default=3, ge=1, le=5, description="Number of debate rounds")
    max_tokens_per_turn: int = Field(default=1024, ge=128, le=4096, description="Max tokens per argument")
    debater_a_name: str = Field(default="Debater A (Pro)", description="Display name for Debater A")
    debater_b_name: str = Field(default="Debater B (Con)", description="Display name for Debater B")

    @property
    def round_structure(self) -> list[DebatePhase]:
        """Generate round phases based on num_rounds."""
        if self.num_rounds == 1:
            return [DebatePhase.OPENING]
        elif self.num_rounds == 2:
            return [DebatePhase.OPENING, DebatePhase.CLOSING]
        else:
            # Opening + (n-2) rebuttals + Closing
            phases = [DebatePhase.OPENING]
            phases.extend([DebatePhase.REBUTTAL] * (self.num_rounds - 2))
            phases.append(DebatePhase.CLOSING)
            return phases


# ──────────────────────── Judge Scoring ────────────────────────


class DimensionScore(BaseModel):
    """Score for a single debater on a single dimension."""
    score: float = Field(..., ge=1.0, le=10.0, description="Score from 1.0 to 10.0")
    comment: str = Field(default="", description="Brief comment on this dimension")


class DebaterRoundScore(BaseModel):
    """All dimension scores for one debater in one round."""
    logic: DimensionScore = Field(..., description="Logical reasoning quality")
    evidence: DimensionScore = Field(..., description="Evidence and factual support")
    rhetoric: DimensionScore = Field(..., description="Persuasive and rhetorical skill")
    rebuttal_strength: DimensionScore = Field(..., description="Effectiveness of rebuttals")
    clarity: DimensionScore = Field(..., description="Clarity and structure of argument")

    @property
    def total(self) -> float:
        """Sum of all dimension scores."""
        return (
            self.logic.score
            + self.evidence.score
            + self.rhetoric.score
            + self.rebuttal_strength.score
            + self.clarity.score
        )


class JudgeRoundScore(BaseModel):
    """Judge's scoring for a complete round."""
    round_number: int
    phase: DebatePhase
    debater_a_scores: DebaterRoundScore
    debater_b_scores: DebaterRoundScore
    round_commentary: str = Field(default="", description="Overall round commentary from judge")

    @property
    def round_winner(self) -> WinnerChoice:
        a_total = self.debater_a_scores.total
        b_total = self.debater_b_scores.total
        if a_total > b_total:
            return WinnerChoice.DEBATER_A
        elif b_total > a_total:
            return WinnerChoice.DEBATER_B
        return WinnerChoice.DRAW


# ──────────────────────── Debate Round ─────────────────────────


class DebateRound(BaseModel):
    """A single round of the debate."""
    round_number: int = Field(..., ge=1)
    phase: DebatePhase
    debater_a_argument: str = Field(default="")
    debater_b_argument: str = Field(default="")
    judge_score: Optional[JudgeRoundScore] = None


# ──────────────────────── Verdict ──────────────────────────────


class Verdict(BaseModel):
    """Final verdict from the judge."""
    winner: WinnerChoice
    debater_a_final_score: float
    debater_b_final_score: float
    reasoning: str = Field(..., description="Judge's reasoning for the verdict")
    key_moments: list[str] = Field(default_factory=list, description="Key moments in the debate")


# ──────────────────────── Debate Result ────────────────────────


class DebateResult(BaseModel):
    """Complete debate record."""
    debate_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    config: DebateConfig
    rounds: list[DebateRound] = Field(default_factory=list)
    verdict: Optional[Verdict] = None
    status: DebateStatus = DebateStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None


# ──────────────────── WebSocket Events ─────────────────────────


class WSEventType(str, Enum):
    """WebSocket event types."""
    # Server → Client
    DEBATE_STARTED = "debate_started"
    ROUND_STARTED = "round_started"
    TURN_STARTED = "turn_started"
    TOKEN_STREAM = "token_stream"
    TURN_COMPLETED = "turn_completed"
    ROUND_COMPLETED = "round_completed"
    JUDGE_SCORING = "judge_scoring"
    JUDGE_OBSERVATION = "judge_observation"
    VERDICT = "verdict"
    DEBATE_COMPLETED = "debate_completed"
    ERROR = "error"

    # Client → Server
    START_DEBATE = "start_debate"
    PAUSE_DEBATE = "pause_debate"
    RESUME_DEBATE = "resume_debate"
    STOP_DEBATE = "stop_debate"


class WSEvent(BaseModel):
    """WebSocket message envelope."""
    type: WSEventType
    data: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────── API Responses ────────────────────────────


class DebateListItem(BaseModel):
    """Summary item for debate listing."""
    debate_id: str
    topic: str
    status: DebateStatus
    winner: Optional[WinnerChoice] = None
    debater_a_model: str
    debater_b_model: str
    created_at: datetime
    duration_seconds: Optional[float] = None


class CreateDebateResponse(BaseModel):
    """Response when creating a new debate."""
    debate_id: str
    status: DebateStatus
    message: str


class ModelInfo(BaseModel):
    """Available model information."""
    model_id: str
    provider: str
    display_name: str
    description: str = ""
