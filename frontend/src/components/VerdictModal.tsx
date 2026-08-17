/**
 * VerdictModal — Animated modal announcing the debate winner
 */

'use client';

import { useEffect, useState } from 'react';
import styles from './VerdictModal.module.css';
import type { Verdict } from '@/lib/types';

interface VerdictModalProps {
  verdict: Verdict;
  debaterAName: string;
  debaterBName: string;
  onClose: () => void;
}

export default function VerdictModal({
  verdict,
  debaterAName,
  debaterBName,
  onClose,
}: VerdictModalProps) {
  const [visible, setVisible] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    // Generate confetti
    const colors = ['#10b981', '#f43f5e', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'];
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setConfettiPieces(pieces);
  }, []);

  const winnerName =
    verdict.winner === 'debater_a'
      ? debaterAName
      : verdict.winner === 'debater_b'
      ? debaterBName
      : 'Draw';

  const winnerEmoji =
    verdict.winner === 'debater_a'
      ? '🟢'
      : verdict.winner === 'debater_b'
      ? '🔴'
      : '🤝';

  return (
    <div className={`${styles.overlay} ${visible ? styles.visible : ''}`} onClick={onClose}>
      {/* Confetti */}
      {verdict.winner !== 'draw' &&
        confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className={styles.confetti}
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              backgroundColor: piece.color,
            }}
          />
        ))}

      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Trophy */}
        <div className={styles.trophy}>🏆</div>

        {/* Title */}
        <h2 className={styles.title}>
          {verdict.winner === 'draw' ? 'It\'s a Draw!' : 'Winner Declared!'}
        </h2>

        {/* Winner name */}
        <div className={styles.winnerRow}>
          <span className={styles.winnerEmoji}>{winnerEmoji}</span>
          <span className={styles.winnerName}>{winnerName}</span>
        </div>

        {/* Scores */}
        <div className={styles.scoreComparison}>
          <div className={`${styles.scoreCard} ${verdict.winner === 'debater_a' ? styles.winner : ''}`}>
            <span className={styles.scoreName}>{debaterAName}</span>
            <span className={styles.scoreNumber}>{verdict.debater_a_final_score.toFixed(1)}</span>
          </div>
          <span className={styles.vs}>VS</span>
          <div className={`${styles.scoreCard} ${verdict.winner === 'debater_b' ? styles.winner : ''}`}>
            <span className={styles.scoreName}>{debaterBName}</span>
            <span className={styles.scoreNumber}>{verdict.debater_b_final_score.toFixed(1)}</span>
          </div>
        </div>

        {/* Reasoning */}
        <div className={styles.reasoning}>
          <h4>Judge&apos;s Reasoning</h4>
          <p>{verdict.reasoning}</p>
        </div>

        {/* Key moments */}
        {verdict.key_moments.length > 0 && (
          <div className={styles.keyMoments}>
            <h4>Key Moments</h4>
            <ul>
              {verdict.key_moments.map((moment, i) => (
                <li key={i}>{moment}</li>
              ))}
            </ul>
          </div>
        )}

        <button className="btn btn-primary btn-lg" onClick={onClose}>
          View Full Results
        </button>
      </div>
    </div>
  );
}
