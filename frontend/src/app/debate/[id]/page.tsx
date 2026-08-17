/**
 * Debate Arena Page — Live split-screen debate view
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useDebateSocket } from '@/hooks/useDebateSocket';
import { useDebateStore } from '@/hooks/useDebateStore';
import DebateCard from '@/components/DebateCard';
import RoundTimeline from '@/components/RoundTimeline';
import JudgePanel from '@/components/JudgePanel';
import ScoreRadar from '@/components/ScoreRadar';
import VerdictModal from '@/components/VerdictModal';
import type { DebateConfig, DebatePhase } from '@/lib/types';
import styles from './page.module.css';

export default function DebateArenaPage() {
  const params = useParams();
  const debateId = params.id as string;

  const [showVerdict, setShowVerdict] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const {
    connected,
    connecting,
    startDebate,
    pauseDebate,
    resumeDebate,
    stopDebate,
  } = useDebateSocket(debateId);

  const {
    config,
    status,
    currentRound,
    currentPhase,
    rounds,
    roundScores,
    verdict,
    streaming,
    judgeObservation,
    error,
  } = useDebateStore();

  // Auto-start debate when WebSocket connects (config comes from URL state or session)
  useEffect(() => {
    if (connected && !hasStarted && !config) {
      // Read config from sessionStorage (set by setup page redirect)
      const savedConfig = sessionStorage.getItem(`debate_config_${debateId}`);
      if (savedConfig) {
        const parsedConfig: DebateConfig = JSON.parse(savedConfig);
        startDebate(parsedConfig);
        setHasStarted(true);
      }
    }
  }, [connected, hasStarted, config, debateId, startDebate]);

  // Show verdict modal when verdict arrives
  useEffect(() => {
    if (verdict && !showVerdict) {
      // Slight delay for dramatic effect
      const timer = setTimeout(() => setShowVerdict(true), 800);
      return () => clearTimeout(timer);
    }
  }, [verdict, showVerdict]);

  // Determine phase list for timeline
  const phases: DebatePhase[] = config
    ? (() => {
        const n = config.num_rounds;
        if (n === 1) return ['opening'];
        if (n === 2) return ['opening', 'closing'];
        const p: DebatePhase[] = ['opening'];
        for (let i = 0; i < n - 2; i++) p.push('rebuttal');
        p.push('closing');
        return p;
      })()
    : [];

  const totalRounds = config?.num_rounds || 3;

  return (
    <main className={styles.main}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <Link href="/" className={styles.logo}>
          🎤 AgentDebate
        </Link>
        <div className={styles.topBarCenter}>
          {config && (
            <span className={styles.topic} title={config.topic}>
              {config.topic.length > 80
                ? config.topic.substring(0, 80) + '...'
                : config.topic}
            </span>
          )}
        </div>
        <div className={styles.topBarRight}>
          <span className={`badge ${status === 'running' ? 'badge-pro' : status === 'completed' ? 'badge-judge' : 'badge-neutral'}`}>
            {status === 'running' ? '● Live' : status === 'completed' ? '✓ Complete' : status}
          </span>
        </div>
      </header>

      {/* Timeline */}
      {config && (
        <div className={styles.timelineWrap}>
          <RoundTimeline
            totalRounds={totalRounds}
            currentRound={currentRound}
            phases={phases}
            completedRounds={rounds.length}
          />
        </div>
      )}

      {/* Connecting / Waiting State */}
      {(connecting || (!connected && !error)) && (
        <div className={styles.connecting}>
          <div className={styles.connectingSpinner} />
          <p>Connecting to debate server...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={styles.errorBanner}>
          ⚠️ {error}
        </div>
      )}

      {/* Split-Screen Debate View */}
      {connected && (
        <div className={styles.arena}>
          {/* Debater A Column (Pro) */}
          <div className={styles.column}>
            {/* Historical rounds */}
            {rounds.map((round) => (
              <DebateCard
                key={`a-${round.round_number}`}
                role="pro"
                modelId={config?.debater_a_model || ''}
                displayName={config?.debater_a_name || 'Debater A'}
                roundNumber={round.round_number}
                phase={round.phase}
                text={round.debater_a_argument}
                isStreaming={false}
                isWaiting={false}
              />
            ))}

            {/* Current round streaming */}
            {currentRound > 0 && currentRound > rounds.length && currentPhase && (
              <DebateCard
                role="pro"
                modelId={config?.debater_a_model || ''}
                displayName={config?.debater_a_name || 'Debater A'}
                roundNumber={currentRound}
                phase={currentPhase}
                text={streaming.debater_a_text}
                isStreaming={streaming.active_agent === 'debater_a' && streaming.is_streaming}
                isWaiting={!streaming.debater_a_text && streaming.active_agent !== 'debater_a'}
              />
            )}
          </div>

          {/* Center Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerLabel}>VS</span>
            <div className={styles.dividerLine} />
          </div>

          {/* Debater B Column (Con) */}
          <div className={styles.column}>
            {/* Historical rounds */}
            {rounds.map((round) => (
              <DebateCard
                key={`b-${round.round_number}`}
                role="con"
                modelId={config?.debater_b_model || ''}
                displayName={config?.debater_b_name || 'Debater B'}
                roundNumber={round.round_number}
                phase={round.phase}
                text={round.debater_b_argument}
                isStreaming={false}
                isWaiting={false}
              />
            ))}

            {/* Current round streaming */}
            {currentRound > 0 && currentRound > rounds.length && currentPhase && (
              <DebateCard
                role="con"
                modelId={config?.debater_b_model || ''}
                displayName={config?.debater_b_name || 'Debater B'}
                roundNumber={currentRound}
                phase={currentPhase}
                text={streaming.debater_b_text}
                isStreaming={streaming.active_agent === 'debater_b' && streaming.is_streaming}
                isWaiting={!streaming.debater_b_text && streaming.active_agent !== 'debater_b'}
              />
            )}
          </div>
        </div>
      )}

      {/* Judge Panel */}
      {connected && config && (
        <div className={styles.judgeWrap}>
          <JudgePanel
            observation={judgeObservation}
            roundScores={roundScores}
            judgeModel={config.judge_model}
            isActive={streaming.active_agent === null && status === 'running' && currentRound > 0}
          />
        </div>
      )}

      {/* Score Radar (after first round scored) */}
      {roundScores.length > 0 && (
        <div className={styles.scoreWrap}>
          <ScoreRadar
            scores={roundScores}
            debaterAName={config?.debater_a_name}
            debaterBName={config?.debater_b_name}
          />
        </div>
      )}

      {/* Controls */}
      {connected && status === 'running' && (
        <div className={styles.controls}>
          <button className="btn btn-secondary btn-icon" onClick={pauseDebate} title="Pause">
            ⏸
          </button>
          <button className="btn btn-secondary btn-icon" onClick={stopDebate} title="Stop">
            ⏹
          </button>
        </div>
      )}

      {status === 'paused' && (
        <div className={styles.controls}>
          <button className="btn btn-primary" onClick={resumeDebate}>
            ▶ Resume Debate
          </button>
          <button className="btn btn-secondary btn-icon" onClick={stopDebate} title="Stop">
            ⏹
          </button>
        </div>
      )}

      {/* Verdict Modal */}
      {verdict && showVerdict && config && (
        <VerdictModal
          verdict={verdict}
          debaterAName={config.debater_a_name}
          debaterBName={config.debater_b_name}
          onClose={() => setShowVerdict(false)}
        />
      )}
    </main>
  );
}
