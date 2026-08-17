/**
 * AgentDebate — Zustand Debate State Store
 *
 * Central state management for the live debate UI.
 * Handles all WebSocket event processing and state transitions.
 */

import { create } from 'zustand';
import type {
  AgentRole,
  DebateConfig,
  DebatePhase,
  DebateRound,
  DebateStatus,
  DebateUIState,
  JudgeRoundScore,
  Verdict,
} from '@/lib/types';

interface DebateStore extends DebateUIState {
  // Actions
  setDebateId: (id: string) => void;
  setConfig: (config: DebateConfig) => void;
  setStatus: (status: DebateStatus) => void;
  startRound: (round: number, phase: DebatePhase) => void;
  startTurn: (agent: AgentRole) => void;
  appendToken: (agent: AgentRole, token: string) => void;
  completeTurn: (agent: AgentRole, fullText: string) => void;
  addRoundScore: (score: JudgeRoundScore) => void;
  completeRound: (round: number) => void;
  setVerdict: (verdict: Verdict) => void;
  setJudgeObservation: (text: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: DebateUIState = {
  debateId: null,
  config: null,
  status: 'pending',
  currentRound: 0,
  currentPhase: null,
  rounds: [],
  roundScores: [],
  verdict: null,
  streaming: {
    debater_a_text: '',
    debater_b_text: '',
    active_agent: null,
    is_streaming: false,
  },
  judgeObservation: '',
  error: null,
};

export const useDebateStore = create<DebateStore>((set, get) => ({
  ...initialState,

  setDebateId: (id) => set({ debateId: id }),

  setConfig: (config) => set({ config }),

  setStatus: (status) => set({ status }),

  startRound: (round, phase) =>
    set({
      currentRound: round,
      currentPhase: phase,
      streaming: {
        debater_a_text: '',
        debater_b_text: '',
        active_agent: null,
        is_streaming: false,
      },
    }),

  startTurn: (agent) =>
    set((state) => ({
      streaming: {
        ...state.streaming,
        active_agent: agent,
        is_streaming: true,
        // Clear the streaming text for the current agent
        ...(agent === 'debater_a' ? { debater_a_text: '' } : {}),
        ...(agent === 'debater_b' ? { debater_b_text: '' } : {}),
      },
    })),

  appendToken: (agent, token) =>
    set((state) => ({
      streaming: {
        ...state.streaming,
        ...(agent === 'debater_a'
          ? { debater_a_text: state.streaming.debater_a_text + token }
          : {}),
        ...(agent === 'debater_b'
          ? { debater_b_text: state.streaming.debater_b_text + token }
          : {}),
      },
    })),

  completeTurn: (agent, fullText) =>
    set((state) => ({
      streaming: {
        ...state.streaming,
        active_agent: null,
        is_streaming: false,
        ...(agent === 'debater_a' ? { debater_a_text: fullText } : {}),
        ...(agent === 'debater_b' ? { debater_b_text: fullText } : {}),
      },
    })),

  addRoundScore: (score) =>
    set((state) => ({
      roundScores: [...state.roundScores, score],
    })),

  completeRound: (round) =>
    set((state) => {
      const newRound: DebateRound = {
        round_number: round,
        phase: state.currentPhase || 'opening',
        debater_a_argument: state.streaming.debater_a_text,
        debater_b_argument: state.streaming.debater_b_text,
        judge_score: state.roundScores.find((s) => s.round_number === round) || null,
      };
      return {
        rounds: [...state.rounds, newRound],
      };
    }),

  setVerdict: (verdict) => set({ verdict, status: 'completed' }),

  setJudgeObservation: (text) => set({ judgeObservation: text }),

  setError: (error) => set({ error, status: error ? 'error' : 'pending' }),

  reset: () => set(initialState),
}));
