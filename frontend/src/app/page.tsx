/**
 * AgentDebate — Landing Page
 *
 * Hero section with animated gradient, feature cards, and Start Debate CTA.
 */

import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.main}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Multi-Agent Debate Platform
          </div>
          <h1 className={styles.heroTitle}>
            Watch AI Models
            <br />
            <span className={styles.heroGradient}>Debate Head-to-Head</span>
          </h1>
          <p className={styles.heroDescription}>
            Set a topic, choose your LLM contenders, and witness structured debates
            unfold in real time — judged by an impartial AI evaluator with detailed scoring.
          </p>
          <div className={styles.heroCTAs}>
            <Link href="/setup" className="btn btn-primary btn-lg">
              🎤 Start New Debate
            </Link>
            <Link href="/history" className="btn btn-secondary btn-lg">
              📜 View History
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featureGrid}>
          <div className={`glass-card ${styles.featureCard}`}>
            <span className={styles.featureIcon}>⚡</span>
            <h3>Real-Time Streaming</h3>
            <p>Watch arguments unfold token by token with live streaming from each model.</p>
          </div>
          <div className={`glass-card ${styles.featureCard}`}>
            <span className={styles.featureIcon}>🧠</span>
            <h3>Multi-Model Debates</h3>
            <p>Pit Qwen, DeepSeek, Gemini, and more against each other in structured rounds.</p>
          </div>
          <div className={`glass-card ${styles.featureCard}`}>
            <span className={styles.featureIcon}>⚖️</span>
            <h3>Impartial Judging</h3>
            <p>Scored across 5 dimensions — Logic, Evidence, Rhetoric, Rebuttal, and Clarity.</p>
          </div>
          <div className={`glass-card ${styles.featureCard}`}>
            <span className={styles.featureIcon}>📊</span>
            <h3>Detailed Analytics</h3>
            <p>Radar charts, round-by-round scores, and comprehensive verdict reasoning.</p>
          </div>
        </div>
      </section>

      {/* Arena Preview */}
      <section className={styles.preview}>
        <div className={styles.previewHeader}>
          <h2>The Debate Arena</h2>
          <p>Split-screen view with real-time argument streaming and judge evaluation</p>
        </div>
        <div className={styles.previewArena}>
          <div className={`${styles.previewSide} ${styles.previewPro}`}>
            <div className={styles.previewLabel}>🟢 PRO — Qwen 3.8</div>
            <div className={styles.previewText}>
              &ldquo;The evidence clearly demonstrates that structured debate
              improves AI reasoning quality by forcing models to consider
              counterarguments...&rdquo;
            </div>
          </div>
          <div className={styles.previewDivider}>VS</div>
          <div className={`${styles.previewSide} ${styles.previewCon}`}>
            <div className={styles.previewLabel}>🔴 CON — DeepSeek V4</div>
            <div className={styles.previewText}>
              &ldquo;While debate may surface certain perspectives, the
              inherent biases in model training data fundamentally limit
              the quality of argumentation...&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>AgentDebate &middot; Multi-Agent Structured Debate Platform</p>
      </footer>
    </main>
  );
}
