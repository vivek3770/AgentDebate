/**
 * StreamingText — Renders text with a streaming cursor effect
 */

'use client';

import { useEffect, useRef } from 'react';
import styles from './StreamingText.module.css';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export default function StreamingText({ text, isStreaming, className = '' }: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text, isStreaming]);

  return (
    <div ref={containerRef} className={`${styles.container} ${className}`}>
      <p className={styles.text}>
        {text || (isStreaming ? '' : '\u00A0')}
        {isStreaming && <span className={styles.cursor}>▊</span>}
      </p>
    </div>
  );
}
