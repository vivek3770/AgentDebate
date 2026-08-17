/**
 * JudgePanel — Collapsible panel showing judge observations and round scores
 */

'use client';

import { useState } from 'react';
import styles from './JudgePanel.module.css';
import type { JudgeRoundScore } from '@/lib/types';

interface JudgePanelProps {
  observation: string;
  roundScores: JudgeRoundScore[];
  judgeModel: string;
  isActive: boolean;
}

export default function JudgePanel({ observation, roundScores, judgeModel, isActive }: JudgePanelProps) {
  const [expanded, setExpanded] = useState(true);

  const latestScore = roundScores[roundScores.length - 1];

  return (
    <div className={`${styles.panel} ${isActive ? styles.active : ''}`}>
      <button className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>⚖️</span>
          <span className={styles.title}>Judge Panel</span>
          <span className={`badge badge-judge ${styles.modelBadge}`}>
            ✦ {judgeModel}
          </span>
        </div>
        <div className={styles.headerRight}>
          {isActive && (
            <span className={styles.statusDot}>
              <span className={styles.statusPulse} />
              Evaluating...
            </span>
          )}
          <span className={styles.chevron} data-expanded={expanded}>
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className={styles.content}>
          {/* Live observation */}
          {observation && (
            <div className={styles.observation}>
              <span className={styles.observationIcon}>💭</span>
              <p>{observation}</p>
            </div>
          )}

          {/* Round scores */}
          {latestScore && (
            <div className={styles.scores}>
              <div className={styles.scoreHeader}>
                <span>Round {latestScore.round_number} Scores</span>
              </div>
              <div className={styles.scoreGrid}>
                <ScoreRow
                  label="Logic"
                  scoreA={latestScore.debater_a_scores.logic.score}
                  scoreB={latestScore.debater_b_scores.logic.score}
                />
                <ScoreRow
                  label="Evidence"
                  scoreA={latestScore.debater_a_scores.evidence.score}
                  scoreB={latestScore.debater_b_scores.evidence.score}
                />
                <ScoreRow
                  label="Rhetoric"
                  scoreA={latestScore.debater_a_scores.rhetoric.score}
                  scoreB={latestScore.debater_b_scores.rhetoric.score}
                />
                <ScoreRow
                  label="Rebuttal"
                  scoreA={latestScore.debater_a_scores.rebuttal_strength.score}
                  scoreB={latestScore.debater_b_scores.rebuttal_strength.score}
                />
                <ScoreRow
                  label="Clarity"
                  scoreA={latestScore.debater_a_scores.clarity.score}
                  scoreB={latestScore.debater_b_scores.clarity.score}
                />
              </div>
              {latestScore.round_commentary && (
                <p className={styles.commentary}>{latestScore.round_commentary}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreRow({ label, scoreA, scoreB }: { label: string; scoreA: number; scoreB: number }) {
  const aWins = scoreA > scoreB;
  const bWins = scoreB > scoreA;

  return (
    <div className={styles.scoreRow}>
      <span className={`${styles.scoreValue} ${aWins ? styles.winning : ''}`}>
        {scoreA.toFixed(1)}
      </span>
      <span className={styles.scoreLabel}>{label}</span>
      <span className={`${styles.scoreValue} ${bWins ? styles.winning : ''}`}>
        {scoreB.toFixed(1)}
      </span>
    </div>
  );
}
