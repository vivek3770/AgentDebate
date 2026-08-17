"""
AgentDebate Backend — Judge Agent

Impartial judge that scores each round across 5 dimensions
and delivers a final verdict with structured JSON output.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from app.models.schemas import (
    DebaterRoundScore,
    DimensionScore,
    DebateRound,
    JudgeRoundScore,
    Verdict,
    WinnerChoice,
)
from app.services.llm_service import get_llm_service

logger = logging.getLogger(__name__)


JUDGE_ROUND_SYSTEM_PROMPT = """You are an impartial, expert debate judge. You evaluate arguments with complete objectivity — judging ONLY the quality of argumentation, NOT the position being argued.

You must score each debater on 5 dimensions (1.0 to 10.0 scale):
1. LOGIC — Soundness of reasoning, valid inferences, absence of fallacies
2. EVIDENCE — Quality and relevance of supporting examples, data, and citations
3. RHETORIC — Persuasive skill, effective use of language, emotional appeal balanced with reason
4. REBUTTAL_STRENGTH — How effectively they addressed the opponent's arguments
5. CLARITY — Organization, structure, and readability of the argument

CRITICAL RULES:
- Be fair and unbiased — a well-argued position you personally disagree with should still score high
- For opening rounds, score rebuttal_strength based on preemptive counter-argumentation
- Provide a brief comment for each dimension explaining the score
- Include overall round commentary

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "debater_a_scores": {
    "logic": {"score": 7.5, "comment": "..."},
    "evidence": {"score": 8.0, "comment": "..."},
    "rhetoric": {"score": 7.0, "comment": "..."},
    "rebuttal_strength": {"score": 6.5, "comment": "..."},
    "clarity": {"score": 8.0, "comment": "..."}
  },
  "debater_b_scores": {
    "logic": {"score": 7.0, "comment": "..."},
    "evidence": {"score": 7.5, "comment": "..."},
    "rhetoric": {"score": 8.0, "comment": "..."},
    "rebuttal_strength": {"score": 7.0, "comment": "..."},
    "clarity": {"score": 7.5, "comment": "..."}
  },
  "round_commentary": "..."
}"""

JUDGE_VERDICT_SYSTEM_PROMPT = """You are an impartial, expert debate judge delivering your FINAL VERDICT after reviewing the complete debate transcript.

Analyze the entire debate and provide:
1. The WINNER — based on cumulative argument quality across all rounds
2. REASONING — a thorough explanation of why the winner prevailed
3. KEY MOMENTS — 2-4 pivotal moments that influenced the outcome

CRITICAL RULES:
- Judge ONLY argument quality, not the position itself
- Consider consistency across rounds, adaptation to rebuttals, and overall persuasiveness
- A close debate may result in a "draw" — but only if scores are genuinely near-equal
- Be specific about what made the winner's arguments superior

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "winner": "debater_a" | "debater_b" | "draw",
  "debater_a_final_score": 37.5,
  "debater_b_final_score": 35.0,
  "reasoning": "...",
  "key_moments": ["...", "...", "..."]
}"""


def _build_round_prompt(
    topic: str,
    round_number: int,
    phase: str,
    debater_a_argument: str,
    debater_b_argument: str,
) -> str:
    """Build the prompt for round-level judging."""
    return f"""DEBATE RESOLUTION: "{topic}"
ROUND {round_number} — Phase: {phase.upper()}

═══ DEBATER A (PRO) ARGUMENT ═══
{debater_a_argument}

═══ DEBATER B (CON) ARGUMENT ═══
{debater_b_argument}

Score both debaters on all 5 dimensions. Respond with JSON only."""


def _build_verdict_prompt(topic: str, rounds: list[DebateRound], round_scores: list[JudgeRoundScore]) -> str:
    """Build the prompt for the final verdict."""
    parts = [f'DEBATE RESOLUTION: "{topic}"\n']
    parts.append("═══ COMPLETE DEBATE TRANSCRIPT ═══\n")

    for r in rounds:
        parts.append(f"── Round {r.round_number} ({r.phase.value.upper()}) ──")
        parts.append(f"PRO Argument:\n{r.debater_a_argument}\n")
        parts.append(f"CON Argument:\n{r.debater_b_argument}\n")

    # Include cumulative scores
    parts.append("\n═══ CUMULATIVE ROUND SCORES ═══")
    total_a = 0
    total_b = 0
    for score in round_scores:
        a_total = score.debater_a_scores.total
        b_total = score.debater_b_scores.total
        total_a += a_total
        total_b += b_total
        parts.append(
            f"Round {score.round_number}: Debater A = {a_total:.1f}, Debater B = {b_total:.1f}"
        )

    parts.append(f"\nCumulative: Debater A = {total_a:.1f}, Debater B = {total_b:.1f}")
    parts.append("\nDeliver your final verdict. Respond with JSON only.")

    return "\n".join(parts)


def _parse_json_response(text: str) -> dict:
    """Extract and parse JSON from model response, handling markdown code blocks."""
    cleaned = text.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    return json.loads(cleaned)


async def judge_round(
    topic: str,
    round_number: int,
    phase: str,
    debater_a_argument: str,
    debater_b_argument: str,
    judge_model: str,
) -> JudgeRoundScore:
    """
    Judge a single debate round. Returns structured scores.
    """
    llm = get_llm_service()

    user_prompt = _build_round_prompt(
        topic, round_number, phase, debater_a_argument, debater_b_argument
    )

    logger.info(f"Judging round {round_number} with model {judge_model}")

    response = await llm.generate(
        model_id=judge_model,
        system_prompt=JUDGE_ROUND_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=2048,
        temperature=0.3,
    )

    try:
        data = _parse_json_response(response)

        return JudgeRoundScore(
            round_number=round_number,
            phase=phase,
            debater_a_scores=DebaterRoundScore(
                logic=DimensionScore(**data["debater_a_scores"]["logic"]),
                evidence=DimensionScore(**data["debater_a_scores"]["evidence"]),
                rhetoric=DimensionScore(**data["debater_a_scores"]["rhetoric"]),
                rebuttal_strength=DimensionScore(**data["debater_a_scores"]["rebuttal_strength"]),
                clarity=DimensionScore(**data["debater_a_scores"]["clarity"]),
            ),
            debater_b_scores=DebaterRoundScore(
                logic=DimensionScore(**data["debater_b_scores"]["logic"]),
                evidence=DimensionScore(**data["debater_b_scores"]["evidence"]),
                rhetoric=DimensionScore(**data["debater_b_scores"]["rhetoric"]),
                rebuttal_strength=DimensionScore(**data["debater_b_scores"]["rebuttal_strength"]),
                clarity=DimensionScore(**data["debater_b_scores"]["clarity"]),
            ),
            round_commentary=data.get("round_commentary", ""),
        )

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.error(f"Failed to parse judge round response: {e}\nRaw: {response}")
        # Return neutral fallback scores
        neutral = DimensionScore(score=5.0, comment="Score parsing error — neutral default")
        fallback = DebaterRoundScore(
            logic=neutral, evidence=neutral, rhetoric=neutral,
            rebuttal_strength=neutral, clarity=neutral,
        )
        return JudgeRoundScore(
            round_number=round_number,
            phase=phase,
            debater_a_scores=fallback,
            debater_b_scores=fallback,
            round_commentary="Judge scoring encountered a parsing error. Default scores applied.",
        )


async def judge_verdict(
    topic: str,
    rounds: list[DebateRound],
    round_scores: list[JudgeRoundScore],
    judge_model: str,
) -> Verdict:
    """
    Deliver the final verdict after all rounds are complete.
    """
    llm = get_llm_service()

    user_prompt = _build_verdict_prompt(topic, rounds, round_scores)

    logger.info(f"Generating final verdict with model {judge_model}")

    response = await llm.generate(
        model_id=judge_model,
        system_prompt=JUDGE_VERDICT_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=2048,
        temperature=0.3,
    )

    try:
        data = _parse_json_response(response)

        return Verdict(
            winner=WinnerChoice(data["winner"]),
            debater_a_final_score=float(data["debater_a_final_score"]),
            debater_b_final_score=float(data["debater_b_final_score"]),
            reasoning=data["reasoning"],
            key_moments=data.get("key_moments", []),
        )

    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
        logger.error(f"Failed to parse verdict response: {e}\nRaw: {response}")

        # Calculate from round scores
        total_a = sum(s.debater_a_scores.total for s in round_scores)
        total_b = sum(s.debater_b_scores.total for s in round_scores)

        if total_a > total_b:
            winner = WinnerChoice.DEBATER_A
        elif total_b > total_a:
            winner = WinnerChoice.DEBATER_B
        else:
            winner = WinnerChoice.DRAW

        return Verdict(
            winner=winner,
            debater_a_final_score=total_a,
            debater_b_final_score=total_b,
            reasoning="Verdict determined from cumulative round scores (judge response parsing failed).",
            key_moments=[],
        )
