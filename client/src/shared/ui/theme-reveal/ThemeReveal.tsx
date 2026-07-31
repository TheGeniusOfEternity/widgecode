import { motion } from 'framer-motion';

import styles from '@/shared/ui/theme-reveal/ThemeReveal.module.css';

export type ThemeRevealState = {
  left: number;
  top: number;
  diameter: number;
  color: string;
};

type ThemeRevealProps = {
  reveal: ThemeRevealState | null;
  onComplete: () => void;
};

export const ThemeReveal = ({ reveal, onComplete }: ThemeRevealProps) => {
  if (!reveal) return null;

  return (
    <motion.div
      className={styles.themeReveal}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 1, opacity: 0 }}
      transition={{
        scale: { duration: 0.4, ease: 'linear' },
        opacity: { delay: 0.4, duration: 0.2, ease: 'easeOut' },
      }}
      onAnimationComplete={onComplete}
      style={{
        left: reveal.left,
        top: reveal.top,
        width: reveal.diameter,
        height: reveal.diameter,
        backgroundColor: reveal.color,
      }}
      aria-hidden="true"
    />
  );
};
