import { Moon, Sun } from '@gravity-ui/icons';
import { Button, Icon, Switch } from '@gravity-ui/uikit';
import type { MouseEvent } from 'react';

import type { AppTheme } from '../../../app/config';
import { messages, type Locale } from '../../../shared/locale/content';
import glassStyles from '../../../shared/ui/glass/Glass.module.css';
import styles from './LandingHeader.module.css';

type LandingHeaderProps = {
  locale: Locale;
  theme: AppTheme;
  isAuthorized: boolean;
  onAuthNavigate: () => void;
  onLocaleToggle: () => void;
  onThemeToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onAuthorizationToggle: (checked: boolean) => void;
};

export const LandingHeader = ({
  locale,
  theme,
  isAuthorized,
  onAuthNavigate,
  onLocaleToggle,
  onThemeToggle,
  onAuthorizationToggle,
}: LandingHeaderProps) => {
  const t = messages[locale];

  return (
    <header className={`${glassStyles.glass} ${styles.headerPanel}`}>
      <Button
        href="/auth"
        view="outlined"
        size="xl"
        onClick={(event) => {
          event.preventDefault();
          onAuthNavigate();
        }}
      >
        {t.authCta}
      </Button>
      <div className={styles.headerControls}>
        <Button size="xl" type="button" view="outlined" onClick={onLocaleToggle}>
          {locale.toUpperCase()}
        </Button>
        <Button
          size="xl"
          type="button"
          view="outlined"
          onClick={onThemeToggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <Icon data={theme === 'dark' ? Moon : Sun} size={20} />
          {theme}
        </Button>
        <Switch checked={isAuthorized} onUpdate={onAuthorizationToggle} content={t.demoAuth} />
      </div>
    </header>
  );
};
