import { Button } from '@gravity-ui/uikit';

import { messages, type Locale } from '../../../shared/locale/content';
import glassStyles from '../../../shared/ui/glass/Glass.module.css';
import styles from './LandingPage.module.css';

type LandingPageProps = {
  locale: Locale;
  onAuthNavigate: () => void;
};

export const LandingPage = ({ locale, onAuthNavigate }: LandingPageProps) => {
  const t = messages[locale];

  return (
    <section className={`${styles.heroPanel} ${glassStyles.glass}`}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <p>{t.subtitle}</p>
      <div className={styles.heroActions}>
        <div className={styles.heroStats}>
          <span className={styles.glassPill}>Glass UI</span>
          <span className={styles.glassPill}>Gravity UI</span>
          <span className={styles.glassPill}>Lavender theme</span>
        </div>
        <Button
          href="/auth"
          view="action"
          size="xl"
          onClick={(event) => {
            event.preventDefault();
            onAuthNavigate();
          }}
        >
          {t.authCta}
        </Button>
      </div>
    </section>
  );
};
