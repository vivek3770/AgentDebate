/**
 * RoundTimeline — Horizontal stepper showing debate round progress
 */

import styles from './RoundTimeline.module.css';
import type { DebatePhase } from '@/lib/types';

interface RoundTimelineProps {
  totalRounds: number;
  currentRound: number;
  phases: DebatePhase[];
  completedRounds: number;
}

const PHASE_LABELS: Record<DebatePhase, string> = {
  opening: 'Opening',
  rebuttal: 'Rebuttal',
  closing: 'Closing',
};

export default function RoundTimeline({
  totalRounds,
  currentRound,
  phases,
  completedRounds,
}: RoundTimelineProps) {
  return (
    <div className={styles.timeline}>
      {phases.map((phase, idx) => {
        const roundNum = idx + 1;
        const isCompleted = roundNum <= completedRounds;
        const isCurrent = roundNum === currentRound;
        const isFuture = roundNum > currentRound;

        return (
          <div key={idx} className={styles.step}>
            {/* Connector line */}
            {idx > 0 && (
              <div className={`${styles.connector} ${isCompleted ? styles.connectorDone : ''}`} />
            )}

            {/* Step circle */}
            <div
              className={`
                ${styles.circle}
                ${isCompleted ? styles.completed : ''}
                ${isCurrent ? styles.current : ''}
                ${isFuture ? styles.future : ''}
              `}
            >
              {isCompleted ? '✓' : roundNum}
            </div>

            {/* Label */}
            <span className={`${styles.label} ${isCurrent ? styles.labelActive : ''}`}>
              {PHASE_LABELS[phase]}
            </span>
          </div>
        );
      })}

      {/* Final verdict step */}
      <div className={styles.step}>
        <div className={`${styles.connector} ${completedRounds >= totalRounds ? styles.connectorDone : ''}`} />
        <div
          className={`
            ${styles.circle}
            ${styles.verdict}
            ${completedRounds >= totalRounds ? styles.current : styles.future}
          `}
        >
          ⚖️
        </div>
        <span className={styles.label}>Verdict</span>
      </div>
    </div>
  );
}
