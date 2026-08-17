/**
 * AgentDebate — REST API Client
 */

import type { CreateDebateResponse, DebateConfig, DebateListItem, DebateResult, ModelInfo } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json();
}

export const api = {
  /** Health check */
  health: () => apiFetch<{ status: string }>('/api/health'),

  /** List available models */
  getModels: () => apiFetch<ModelInfo[]>('/api/models'),

  /** Create a new debate */
  createDebate: (config: DebateConfig) =>
    apiFetch<CreateDebateResponse>('/api/debates', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  /** List all debates */
  listDebates: () => apiFetch<DebateListItem[]>('/api/debates'),

  /** Get debate details */
  getDebate: (debateId: string) => apiFetch<DebateResult>(`/api/debates/${debateId}`),

  /** Delete a debate */
  deleteDebate: (debateId: string) =>
    apiFetch<{ message: string }>(`/api/debates/${debateId}`, { method: 'DELETE' }),
};

/** WebSocket URL builder */
export function getWSUrl(debateId: string): string {
  const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    .replace('http://', 'ws://')
    .replace('https://', 'wss://');
  return `${wsBase}/ws/debate/${debateId}`;
}
