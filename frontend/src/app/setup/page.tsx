/**
 * Debate Setup Page — Configure topic, models, and rounds
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { DebateConfig } from '@/lib/types';
import styles from './page.module.css';

const MODELS = [
  { id: 'Qwen/Qwen3.8-2.4T-A95B', name: 'Qwen 3.8 (2.4T)', icon: '🧠', provider: 'HuggingFace' },
  { id: 'deepseek-ai/DeepSeek-V4-Pro-0813', name: 'DeepSeek V4 Pro', icon: '🔮', provider: 'HuggingFace' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', icon: '✦', provider: 'Google' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', icon: '✦', provider: 'Google' },
];

const SUGGESTED_TOPICS = [
  'AI will replace most white-collar jobs within 20 years',
  'Social media has been a net negative for society',
  'Universal basic income should be implemented globally',
  'Space colonization should be prioritized over solving Earth\'s problems',
  'Open-source AI models are better for society than proprietary ones',
];

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [config, setConfig] = useState<DebateConfig>({
    topic: '',
    debater_a_model: 'Qwen/Qwen3.8-2.4T-A95B',
    debater_b_model: 'deepseek-ai/DeepSeek-V4-Pro-0813',
    judge_model: 'gemini-2.5-flash',
    num_rounds: 3,
    max_tokens_per_turn: 1024,
    debater_a_name: 'Debater A (Pro)',
    debater_b_name: 'Debater B (Con)',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.topic.trim()) {
      setError('Please enter a debate topic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.createDebate(config);
      // Store config for the arena page to pick up
      sessionStorage.setItem(`debate_config_${response.debate_id}`, JSON.stringify(config));
      router.push(`/debate/${response.debate_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create debate');
      setLoading(false);
    }
  };

  const update = (field: keyof DebateConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Back</Link>
        <h1>Configure Your Debate</h1>
        <p>Set the topic, pick your models, and customize the rules.</p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Topic */}
        <section className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>📝 Debate Topic</h2>
          <textarea
            className={`input textarea ${styles.topicInput}`}
            placeholder="Enter a resolution or topic for debate..."
            value={config.topic}
            onChange={(e) => update('topic', e.target.value)}
            maxLength={500}
          />
          <div className={styles.suggestions}>
            <span className={styles.suggestLabel}>Suggestions:</span>
            <div className={styles.suggestionPills}>
              {SUGGESTED_TOPICS.map((topic, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.suggestionPill}
                  onClick={() => update('topic', topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Models */}
        <section className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>🤖 Model Selection</h2>
          <div className={styles.modelGrid}>
            {/* Debater A */}
            <div className={styles.modelCard}>
              <div className={`${styles.modelHeader} ${styles.modelPro}`}>
                <span>🟢</span>
                <span>Debater A (Pro)</span>
              </div>
              <label className="label">Model</label>
              <select
                className="input select"
                value={config.debater_a_model}
                onChange={(e) => update('debater_a_model', e.target.value)}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon} {m.name} — {m.provider}
                  </option>
                ))}
              </select>
              <label className="label" style={{ marginTop: 12 }}>Display Name</label>
              <input
                className="input"
                value={config.debater_a_name}
                onChange={(e) => update('debater_a_name', e.target.value)}
              />
            </div>

            {/* VS Divider */}
            <div className={styles.vsDivider}>VS</div>

            {/* Debater B */}
            <div className={styles.modelCard}>
              <div className={`${styles.modelHeader} ${styles.modelCon}`}>
                <span>🔴</span>
                <span>Debater B (Con)</span>
              </div>
              <label className="label">Model</label>
              <select
                className="input select"
                value={config.debater_b_model}
                onChange={(e) => update('debater_b_model', e.target.value)}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon} {m.name} — {m.provider}
                  </option>
                ))}
              </select>
              <label className="label" style={{ marginTop: 12 }}>Display Name</label>
              <input
                className="input"
                value={config.debater_b_name}
                onChange={(e) => update('debater_b_name', e.target.value)}
              />
            </div>
          </div>

          {/* Judge */}
          <div className={styles.judgeRow}>
            <div className={styles.judgeHeader}>
              <span>⚖️</span>
              <span>Judge Model</span>
            </div>
            <select
              className="input select"
              value={config.judge_model}
              onChange={(e) => update('judge_model', e.target.value)}
              style={{ maxWidth: 400 }}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.icon} {m.name} — {m.provider}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Settings */}
        <section className={`glass-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>⚙️ Debate Settings</h2>
          <div className={styles.settingsGrid}>
            <div>
              <label className="label">Number of Rounds</label>
              <select
                className="input select"
                value={config.num_rounds}
                onChange={(e) => update('num_rounds', parseInt(e.target.value))}
              >
                <option value={1}>1 Round (Opening only)</option>
                <option value={2}>2 Rounds (Opening + Closing)</option>
                <option value={3}>3 Rounds (Opening + Rebuttal + Closing)</option>
                <option value={4}>4 Rounds (Opening + 2 Rebuttals + Closing)</option>
                <option value={5}>5 Rounds (Opening + 3 Rebuttals + Closing)</option>
              </select>
            </div>
            <div>
              <label className="label">Max Tokens per Turn</label>
              <select
                className="input select"
                value={config.max_tokens_per_turn}
                onChange={(e) => update('max_tokens_per_turn', parseInt(e.target.value))}
              >
                <option value={512}>512 (Concise)</option>
                <option value={1024}>1024 (Standard)</option>
                <option value={2048}>2048 (Detailed)</option>
                <option value={4096}>4096 (Comprehensive)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Submit */}
        <div className={styles.submitRow}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !config.topic.trim()}
          >
            {loading ? '⏳ Creating...' : '🎤 Start Debate'}
          </button>
        </div>
      </form>
    </main>
  );
}
