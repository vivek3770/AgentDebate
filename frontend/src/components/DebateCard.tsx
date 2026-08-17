/**
 * DebateCard — A glassmorphic card for a single argument in a debate round
 */

import StreamingText from './StreamingText';
import ModelBadge from './ModelBadge';
import styles from './DebateCard.module.css';
import type { DebatePhase } from '@/lib/types';

interface DebateCardProps {
  role: 'pro' | 'con';
  modelId: string;
  displayName: string;
  roundNumber: number;
  phase: DebatePhase;
  text: string;
  isStreaming: boolean;
  isWaiting: boolean;
}

const PHASE_LABELS: Record<DebatePhase, string> = {
  opening: 'Opening Statement',
  rebuttal: 'Rebuttal',
  closing: 'Closing Statement',
};

export default function DebateCard({
  role,
  modelId,
  displayName,
  roundNumber,
  phase,
  text,
  isStreaming,
  isWaiting,
}: DebateCardProps) {
  return (
    <div className={`${styles.card} ${styles[role]} ${isStreaming ? styles.active : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.roleIcon}>{role === 'pro' ? '🟢' : '🔴'}</span>
          <span className={styles.roleName}>{displayName}</span>
        </div>
        <ModelBadge modelId={modelId} variant={role === 'pro' ? 'pro' : 'con'} />
      </div>

      {/* Phase label */}
      <div className={styles.phaseLabel}>
        Round {roundNumber} — {PHASE_LABELS[phase]}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {isWaiting ? (
          <div className={styles.waiting}>
            <span className={styles.waitingDot} />
            <span className={styles.waitingDot} />
            <span className={styles.waitingDot} />
            <span className={styles.waitingText}>Waiting for turn...</span>
          </div>
        ) : (
          <StreamingText text={text} isStreaming={isStreaming} />
        )}
      </div>
    </div>
  );
}
