/**
 * AgentDebate — WebSocket Hook
 *
 * Manages the WebSocket connection lifecycle and routes incoming
 * debate events to the Zustand store.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getWSUrl } from '@/lib/api';
import { useDebateStore } from './useDebateStore';
import type { DebateConfig, WSEvent } from '@/lib/types';

interface UseDebateSocketReturn {
  connected: boolean;
  connecting: boolean;
  startDebate: (config: DebateConfig) => void;
  pauseDebate: () => void;
  resumeDebate: () => void;
  stopDebate: () => void;
  disconnect: () => void;
}

export function useDebateSocket(debateId: string | null): UseDebateSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const {
    setDebateId,
    setConfig,
    setStatus,
    startRound,
    startTurn,
    appendToken,
    completeTurn,
    addRoundScore,
    completeRound,
    setVerdict,
    setJudgeObservation,
    setError,
  } = useDebateStore();

  // Handle incoming WebSocket events
  const handleEvent = useCallback(
    (event: WSEvent) => {
      switch (event.type) {
        case 'debate_started':
          setStatus('running');
          setDebateId(event.data.debate_id as string);
          break;

        case 'round_started':
          startRound(
            event.data.round as number,
            event.data.phase as 'opening' | 'rebuttal' | 'closing'
          );
          break;

        case 'turn_started':
          startTurn(event.data.agent as 'debater_a' | 'debater_b');
          break;

        case 'token_stream':
          appendToken(
            event.data.agent as 'debater_a' | 'debater_b',
            event.data.token as string
          );
          break;

        case 'turn_completed':
          completeTurn(
            event.data.agent as 'debater_a' | 'debater_b',
            event.data.full_text as string
          );
          break;

        case 'round_completed':
          completeRound(event.data.round as number);
          break;

        case 'judge_scoring':
          addRoundScore(event.data.scores as any);
          break;

        case 'judge_observation':
          setJudgeObservation(event.data.text as string);
          break;

        case 'verdict':
          setVerdict(event.data as any);
          break;

        case 'debate_completed':
          setStatus('completed');
          break;

        case 'error':
          setError(event.data.message as string);
          break;
      }
    },
    [
      setStatus, setDebateId, startRound, startTurn, appendToken,
      completeTurn, addRoundScore, completeRound, setVerdict,
      setJudgeObservation, setError,
    ]
  );

  // Connect to WebSocket
  useEffect(() => {
    if (!debateId) return;

    setConnecting(true);
    const ws = new WebSocket(getWSUrl(debateId));
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
    };

    ws.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data);
        handleEvent(event);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setConnecting(false);
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [debateId, handleEvent, setError]);

  // Send message helper
  const send = useCallback((type: string, data: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const startDebate = useCallback(
    (config: DebateConfig) => {
      setConfig(config);
      send('start_debate', { config });
    },
    [send, setConfig]
  );

  const pauseDebate = useCallback(() => send('pause_debate'), [send]);
  const resumeDebate = useCallback(() => send('resume_debate'), [send]);
  const stopDebate = useCallback(() => send('stop_debate'), [send]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return {
    connected,
    connecting,
    startDebate,
    pauseDebate,
    resumeDebate,
    stopDebate,
    disconnect,
  };
}
