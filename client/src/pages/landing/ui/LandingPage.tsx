import { Button } from '@gravity-ui/uikit';
import type { MouseEvent } from 'react';

import { messages, type Locale } from '../../../shared/locale/content';
import glassStyles from '../../../shared/ui/glass/Glass.module.css';
import styles from './LandingPage.module.css';

type LandingPageProps = {
  locale: Locale;
  isAuthorized: boolean;
  onAuthNavigate: () => void;
};

export const LandingPage = ({ locale, isAuthorized, onAuthNavigate }: LandingPageProps) => {
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
          href={isAuthorized ? '/dashboard' : '/register'}
          view="action"
          size="xl"
          onClick={(event: MouseEvent<HTMLElement>) => {
            event.preventDefault();
            onAuthNavigate();
          }}
        >
          {isAuthorized ? t.dashboard : t.authCta}
        </Button>
      </div>
    </section>
  );
};
