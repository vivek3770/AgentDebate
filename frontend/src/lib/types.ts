/**
 * AgentDebate — Shared TypeScript Types
 *
 * Mirrors the backend Pydantic schemas for type-safe frontend development.
 */

// ──────────────── Enums ────────────────

export type DebatePhase = 'opening' | 'rebuttal' | 'closing';
export type DebateStatus = 'pending' | 'running' | 'paused' | 'completed' | 'error';
export type AgentRole = 'debater_a' | 'debater_b' | 'judge';
export type WinnerChoice = 'debater_a' | 'debater_b' | 'draw';

// ──────────────── Configuration ────────────────

export interface DebateConfig {
  topic: string;
  debater_a_model: string;
  debater_b_model: string;
  judge_model: string;
  num_rounds: number;
  max_tokens_per_turn: number;
  debater_a_name: string;
  debater_b_name: string;
}

// ──────────────── Scoring ────────────────

export interface DimensionScore {
  score: number;
  comment: string;
}

export interface DebaterRoundScore {
  logic: DimensionScore;
  evidence: DimensionScore;
  rhetoric: DimensionScore;
  rebuttal_strength: DimensionScore;
  clarity: DimensionScore;
}

export interface JudgeRoundScore {
  round_number: number;
  phase: DebatePhase;
  debater_a_scores: DebaterRoundScore;
  debater_b_scores: DebaterRoundScore;
  round_commentary: string;
}

// ──────────────── Debate Structures ────────────────

export interface DebateRound {
  round_number: number;
  phase: DebatePhase;
  debater_a_argument: string;
  debater_b_argument: string;
  judge_score: JudgeRoundScore | null;
}

export interface Verdict {
  winner: WinnerChoice;
  debater_a_final_score: number;
  debater_b_final_score: number;
  reasoning: string;
  key_moments: string[];
}

export interface DebateResult {
  debate_id: string;
  config: DebateConfig;
  rounds: DebateRound[];
  verdict: Verdict | null;
  status: DebateStatus;
  created_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

// ──────────────── WebSocket Events ────────────────

export type WSEventType =
  | 'debate_started'
  | 'round_started'
  | 'turn_started'
  | 'token_stream'
  | 'turn_completed'
  | 'round_completed'
  | 'judge_scoring'
  | 'judge_observation'
  | 'verdict'
  | 'debate_completed'
  | 'error'
  | 'start_debate'
  | 'pause_debate'
  | 'resume_debate'
  | 'stop_debate';

export interface WSEvent {
  type: WSEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

// ──────────────── API Responses ────────────────

export interface CreateDebateResponse {
  debate_id: string;
  status: DebateStatus;
  message: string;
}

export interface DebateListItem {
  debate_id: string;
  topic: string;
  status: DebateStatus;
  winner: WinnerChoice | null;
  debater_a_model: string;
  debater_b_model: string;
  created_at: string;
  duration_seconds: number | null;
}

export interface ModelInfo {
  model_id: string;
  provider: string;
  display_name: string;
  description: string;
}

// ──────────────── UI State ────────────────

export interface StreamingState {
  debater_a_text: string;
  debater_b_text: string;
  active_agent: AgentRole | null;
  is_streaming: boolean;
}

export interface DebateUIState {
  debateId: string | null;
  config: DebateConfig | null;
  status: DebateStatus;
  currentRound: number;
  currentPhase: DebatePhase | null;
  rounds: DebateRound[];
  roundScores: JudgeRoundScore[];
  verdict: Verdict | null;
  streaming: StreamingState;
  judgeObservation: string;
  error: string | null;
}
