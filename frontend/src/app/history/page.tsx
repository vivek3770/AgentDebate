/**
 * History Page — Browse past debates
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { DebateListItem } from '@/lib/types';
import styles from './page.module.css';

export default function HistoryPage() {
  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDebates();
  }, []);

  async function loadDebates() {
    try {
      const data = await api.listDebates();
      setDebates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load debates');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(debateId: string) {
    if (!confirm('Delete this debate?')) return;
    try {
      await api.deleteDebate(debateId);
      setDebates((prev) => prev.filter((d) => d.debate_id !== debateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-judge';
      case 'running': return 'badge-pro';
      case 'error': return 'badge-con';
      default: return 'badge-neutral';
    }
  };

  const getWinnerLabel = (winner: string | null) => {
    if (!winner) return null;
    if (winner === 'debater_a') return { text: 'Pro wins', class: 'badge-pro' };
    if (winner === 'debater_b') return { text: 'Con wins', class: 'badge-con' };
    return { text: 'Draw', class: 'badge-neutral' };
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Back</Link>
        <h1>Debate History</h1>
        <p>Browse past debates and their results</p>
      </header>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Loading debates...
        </div>
      )}

      {error && <div className={styles.error}>⚠️ {error}</div>}

      {!loading && debates.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📭</span>
          <h3>No debates yet</h3>
          <p>Start your first debate to see it here.</p>
          <Link href="/setup" className="btn btn-primary">
            🎤 Start New Debate
          </Link>
        </div>
      )}

      <div className={styles.list}>
        {debates.map((debate) => {
          const winner = getWinnerLabel(debate.winner);
          return (
            <div key={debate.debate_id} className={`glass-card ${styles.card}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTopic}>{debate.topic}</h3>
                <div className={styles.badges}>
                  <span className={`badge ${getStatusBadge(debate.status)}`}>
                    {debate.status}
                  </span>
                  {winner && (
                    <span className={`badge ${winner.class}`}>{winner.text}</span>
                  )}
                </div>
              </div>
              <div className={styles.cardMeta}>
                <span>🧠 {debate.debater_a_model.split('/').pop()}</span>
                <span className={styles.metaVs}>vs</span>
                <span>🔮 {debate.debater_b_model.split('/').pop()}</span>
                <span className={styles.metaDivider}>·</span>
                <span>⏱ {formatDuration(debate.duration_seconds)}</span>
                <span className={styles.metaDivider}>·</span>
                <span>{formatDate(debate.created_at)}</span>
              </div>
              <div className={styles.cardActions}>
                <Link href={`/debate/${debate.debate_id}`} className="btn btn-secondary">
                  View Details
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDelete(debate.debate_id)}
                  style={{ color: 'var(--con-light)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
