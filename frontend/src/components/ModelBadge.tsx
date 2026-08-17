/**
 * ModelBadge — Displays model name with provider-colored pill
 */

import styles from './ModelBadge.module.css';

interface ModelBadgeProps {
  modelId: string;
  variant?: 'pro' | 'con' | 'judge' | 'neutral';
}

const MODEL_DISPLAY: Record<string, { name: string; icon: string }> = {
  'Qwen/Qwen3.8-2.4T-A95B': { name: 'Qwen 3.8', icon: '🧠' },
  'deepseek-ai/DeepSeek-V4-Pro-0813': { name: 'DeepSeek V4', icon: '🔮' },
  'gemini-2.5-flash': { name: 'Gemini Flash', icon: '✦' },
  'gemini-2.5-pro': { name: 'Gemini Pro', icon: '✦' },
};

export default function ModelBadge({ modelId, variant = 'neutral' }: ModelBadgeProps) {
  const display = MODEL_DISPLAY[modelId] || { name: modelId.split('/').pop(), icon: '🤖' };

  return (
    <span className={`badge badge-${variant} ${styles.badge}`}>
      <span className={styles.icon}>{display.icon}</span>
      <span className={styles.name}>{display.name}</span>
    </span>
  );
}
