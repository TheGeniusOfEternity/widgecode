import type { ReactNode } from 'react';

import styles from '@/shared/ui/auth-card/AuthCard.module.css';

export type AuthCardNotice = { tone: 'success' | 'error'; text: string };

/** Centered card for single-purpose auth screens (password reset, email confirmation). */
export const AuthCard = ({
  eyebrow,
  title,
  subtitle,
  notice,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  notice?: AuthCardNotice | null;
  children?: ReactNode;
}) => (
  <main className={styles.page}>
    <div className={styles.card}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {notice && (
        <p
          className={notice.tone === 'success' ? styles.success : styles.error}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
      {children}
    </div>
  </main>
);
