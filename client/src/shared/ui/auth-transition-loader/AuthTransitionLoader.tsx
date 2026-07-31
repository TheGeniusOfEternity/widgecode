import styles from '@/shared/ui/auth-transition-loader/AuthTransitionLoader.module.css';

type AuthTransitionLoaderProps = {
  locale: 'ru' | 'en';
  reducedMotion: boolean;
};

export const AuthTransitionLoader = ({ locale, reducedMotion }: AuthTransitionLoaderProps) => (
  <div
    className={`${styles.loader} ${reducedMotion ? styles.loaderReduced : ''}`}
    role="status"
    aria-live="polite"
  >
    <div className={styles.loaderVisual} aria-hidden="true">
      <span className={`${styles.orbit} ${styles.orbitWide}`} />
      <span className={`${styles.orbit} ${styles.orbitTight}`} />
      <span className={`${styles.dot} ${styles.dotLavender}`} />
      <span className={`${styles.dot} ${styles.dotMint}`} />
      <span className={`${styles.dot} ${styles.dotBlue}`} />
      <span className={styles.loaderCore}>W</span>
    </div>
    <p className={styles.loaderTitle}>
      {locale === 'ru' ? 'Настраиваем ваше пространство' : 'Preparing your workspace'}
    </p>
    <p className={styles.loaderSubtitle}>
      {locale === 'ru' ? 'Проверяем защищённое соединение' : 'Checking your secure connection'}
    </p>
    <span className={styles.progressTrack} aria-hidden="true">
      <span className={styles.progressBar} />
    </span>
  </div>
);
