/**
 * ScoreRadar — Radar/Spider chart showing judge scores across 5 dimensions
 */

'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import styles from './ScoreRadar.module.css';
import type { JudgeRoundScore } from '@/lib/types';

interface ScoreRadarProps {
  scores: JudgeRoundScore[];
  debaterAName?: string;
  debaterBName?: string;
}

export default function ScoreRadar({
  scores,
  debaterAName = 'Debater A (Pro)',
  debaterBName = 'Debater B (Con)',
}: ScoreRadarProps) {
  if (scores.length === 0) return null;

  // Aggregate scores across all rounds
  const dimensions = ['logic', 'evidence', 'rhetoric', 'rebuttal_strength', 'clarity'] as const;
  const labels: Record<string, string> = {
    logic: 'Logic',
    evidence: 'Evidence',
    rhetoric: 'Rhetoric',
    rebuttal_strength: 'Rebuttal',
    clarity: 'Clarity',
  };

  const data = dimensions.map((dim) => {
    const avgA =
      scores.reduce((sum, s) => sum + s.debater_a_scores[dim].score, 0) / scores.length;
    const avgB =
      scores.reduce((sum, s) => sum + s.debater_b_scores[dim].score, 0) / scores.length;

    return {
      dimension: labels[dim],
      [debaterAName]: Number(avgA.toFixed(1)),
      [debaterBName]: Number(avgB.toFixed(1)),
      fullMark: 10,
    };
  });

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Score Analysis</h4>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#8b95b0', fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: '#5a6478', fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name={debaterAName}
            dataKey={debaterAName}
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Radar
            name={debaterBName}
            dataKey={debaterBName}
            stroke="#f43f5e"
            fill="#f43f5e"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Legend
            wrapperStyle={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#8b95b0',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
