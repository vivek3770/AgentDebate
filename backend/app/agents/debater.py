"""
AgentDebate Backend — Debater Agent

Defines the debater agent logic: system prompts for Pro/Con stances,
argument generation with full debate context, and streaming output.
"""

from __future__ import annotations

import logging
from typing import AsyncIterator

from app.models.schemas import AgentRole, DebatePhase, DebateRound
from app.services.llm_service import get_llm_service

logger = logging.getLogger(__name__)


# ──────────────────── System Prompts ───────────────────────────

PRO_SYSTEM_PROMPT = """You are an expert debater arguing FOR the following resolution. Your role is to defend this position with rigorous, well-structured arguments.

GUIDELINES:
- Present clear, logical arguments with supporting evidence and examples
- Use rhetorical techniques effectively — analogies, statistics, expert citations
- In rebuttal rounds, directly address and dismantle your opponent's specific claims
- Maintain intellectual honesty — acknowledge complexities while defending your position
- Structure arguments with clear thesis statements and supporting points
- Be persuasive but never resort to logical fallacies
- Keep your response focused and within the expected length

ROUND-SPECIFIC INSTRUCTIONS:
- OPENING: Present your strongest foundational arguments for the resolution
- REBUTTAL: Directly counter your opponent's previous arguments while reinforcing your position
- CLOSING: Synthesize your strongest points, address remaining counterarguments, and deliver a compelling conclusion

You must argue FOR the resolution regardless of your personal assessment. This is an academic debate exercise."""

CON_SYSTEM_PROMPT = """You are an expert debater arguing AGAINST the following resolution. Your role is to challenge and deconstruct the opposing position with rigorous counterarguments.

GUIDELINES:
- Identify and exploit weaknesses in the pro-side's reasoning
- Present compelling counter-evidence, alternative frameworks, and real-world examples
- In rebuttal rounds, directly challenge specific claims made by your opponent
- Highlight unintended consequences, false assumptions, and logical gaps
- Structure counterarguments clearly with thesis and evidence
- Be incisive and analytical without resorting to logical fallacies
- Keep your response focused and within the expected length

ROUND-SPECIFIC INSTRUCTIONS:
- OPENING: Present your strongest counterarguments against the resolution
- REBUTTAL: Systematically dismantle your opponent's previous claims while building your counter-narrative
- CLOSING: Demonstrate why the weight of evidence opposes the resolution and deliver a decisive conclusion

You must argue AGAINST the resolution regardless of your personal assessment. This is an academic debate exercise."""


def _build_context(
    topic: str,
    phase: DebatePhase,
    round_number: int,
    rounds_history: list[DebateRound],
    role: AgentRole,
) -> str:
    """Build the user prompt with full debate context."""
    parts = [f"DEBATE RESOLUTION: \"{topic}\"\n"]
    parts.append(f"CURRENT ROUND: {round_number} — Phase: {phase.value.upper()}\n")

    # Include prior rounds as context
    if rounds_history:
        parts.append("═══ DEBATE HISTORY ═══\n")
        for r in rounds_history:
            parts.append(f"── Round {r.round_number} ({r.phase.value.upper()}) ──")
            if r.debater_a_argument:
                parts.append(f"PRO Argument:\n{r.debater_a_argument}\n")
            if r.debater_b_argument:
                parts.append(f"CON Argument:\n{r.debater_b_argument}\n")

    # Phase-specific instruction
    if phase == DebatePhase.OPENING:
        parts.append(
            "Present your opening arguments for this debate. "
            "Focus on your strongest foundational points."
        )
    elif phase == DebatePhase.REBUTTAL:
        opponent = "CON" if role == AgentRole.DEBATER_A else "PRO"
        parts.append(
            f"Rebut the {opponent} side's arguments from the previous round. "
            "Directly address their specific claims while reinforcing your position."
        )
    elif phase == DebatePhase.CLOSING:
        parts.append(
            "Deliver your closing statement. Synthesize your strongest arguments, "
            "address any remaining counterpoints, and make your final case."
        )

    parts.append("\nYour argument:")
    return "\n".join(parts)


async def generate_argument_stream(
    topic: str,
    model_id: str,
    role: AgentRole,
    phase: DebatePhase,
    round_number: int,
    rounds_history: list[DebateRound],
    max_tokens: int = 1024,
) -> AsyncIterator[str]:
    """
    Stream an argument from a debater agent.

    Yields text tokens as they arrive from the LLM.
    """
    llm = get_llm_service()

    system_prompt = PRO_SYSTEM_PROMPT if role == AgentRole.DEBATER_A else CON_SYSTEM_PROMPT
    user_prompt = _build_context(topic, phase, round_number, rounds_history, role)

    logger.info(f"Generating {role.value} argument: round={round_number}, phase={phase.value}, model={model_id}")

    async for token in llm.generate_stream(
        model_id=model_id,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max_tokens,
        temperature=0.7,
    ):
        yield token
