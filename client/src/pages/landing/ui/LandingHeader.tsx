import { Moon, Sun } from '@gravity-ui/icons';
import { Button, Icon } from '@gravity-ui/uikit';
import type { MouseEvent } from 'react';

import type { AppTheme } from '@/app/config';
import { messages, type Locale } from '@/shared/locale/content';
import glassStyles from '@/shared/ui/glass/Glass.module.css';
import styles from '@/pages/landing/ui/LandingHeader.module.css';

type LandingHeaderProps = {
  locale: Locale;
  theme: AppTheme;
  isAuthorized: boolean;
  onAuthNavigate: () => void;
  onDashboardNavigate: () => void;
  onLogout: () => void;
  onLocaleToggle: () => void;
  onThemeToggle: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const LandingHeader = ({
  locale,
  theme,
  isAuthorized,
  onAuthNavigate,
  onDashboardNavigate,
  onLogout,
  onLocaleToggle,
  onThemeToggle,
}: LandingHeaderProps) => {
  const t = messages[locale];

  return (
    <header className={`${glassStyles.glass} ${styles.headerPanel}`}>
      <Button
        href={isAuthorized ? '/dashboard' : '/register'}
        view="outlined"
        size="xl"
        onClick={(event: MouseEvent<HTMLElement>) => {
          event.preventDefault();
          if (isAuthorized) onDashboardNavigate();
          else onAuthNavigate();
        }}
      >
        {isAuthorized ? t.dashboard : t.authCta}
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
        {isAuthorized && (
          <Button size="xl" type="button" view="outlined" onClick={onLogout}>
            {t.logout}
          </Button>
        )}
      </div>
    </header>
  );
};
