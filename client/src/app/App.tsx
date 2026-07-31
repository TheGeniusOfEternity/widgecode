import { ThemeProvider } from '@gravity-ui/uikit';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type MouseEvent } from 'react';

import { AuthPage, type AuthTab } from '../pages/auth';
import { LandingHeader, LandingPage } from '../pages/landing';
import { WidgetsGalleryPage } from '../pages/widgets-gallery';
import type { WidgetCardData } from '../entities/widget';
import {
  APP_LOCALE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  getSystemLocale,
  getSystemTheme,
  type AppTheme,
  type Locale,
} from './config';
import { widgets } from '../shared/locale/content';
import { ThemeReveal, type ThemeRevealState } from '../shared/ui/theme-reveal';
import styles from './App.module.css';
import './Theme.module.css';

type AppRoute = 'landing' | 'auth';

const getRoute = (): AppRoute => (window.location.pathname === '/auth' ? 'auth' : 'landing');

export const App = () => {
  const [theme, setTheme] = useState<AppTheme>(
    () => (localStorage.getItem(APP_THEME_STORAGE_KEY) as AppTheme) || getSystemTheme(),
  );
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem(APP_LOCALE_STORAGE_KEY) as Locale) || getSystemLocale(),
  );
  const [isAuthorized, setAuthorized] = useState(false);
  const [route, setRoute] = useState<AppRoute>(getRoute);
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetCardData[]>(() => [...widgets]);
  const [authTab, setAuthTab] = useState<AuthTab>('signin');
  const [themeReveal, setThemeReveal] = useState<ThemeRevealState | null>(null);
  const [isLocaleTransitioning, setLocaleTransitioning] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const navigateToAuth = () => {
    window.history.pushState({}, '', '/auth');
    setRoute('auth');
  };

  useEffect(() => {
    const handlePopState = () => setRoute(getRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLocaleToggle = () => {
    if (isLocaleTransitioning) return;

    const nextLocale = locale === 'en' ? 'ru' : 'en';
    if (prefersReducedMotion) {
      setLocale(nextLocale);
      return;
    }

    setLocaleTransitioning(true);
    window.setTimeout(() => setLocale(nextLocale), 140);
    window.setTimeout(() => setLocaleTransitioning(false), 360);
  };

  const handleThemeToggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (themeReveal) return;

    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const buttonBounds = event.currentTarget.getBoundingClientRect();
    const x = buttonBounds.left + buttonBounds.width / 2;
    const y = buttonBounds.top + buttonBounds.height / 2;

    if (prefersReducedMotion) {
      setTheme(nextTheme);
      return;
    }

    const radius =
      Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 2;

    setThemeReveal({
      left: x - radius,
      top: y - radius,
      diameter: radius * 2,
      color: nextTheme === 'dark' ? '#11101a' : '#f6f1eb',
    });

    window.setTimeout(() => setTheme(nextTheme), 400);
  };

  useEffect(() => {
    localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  return (
    <ThemeProvider theme={theme}>
      <div className={styles.appShell}>
        <div className={`${styles.orb} ${styles.orbLavender}`} />
        <div className={`${styles.orb} ${styles.orbBlue}`} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className={styles.motionDiv}
            key={isAuthorized ? 'gallery' : route}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            {!isAuthorized && route === 'landing' && (
              <LandingHeader
                locale={locale}
                theme={theme}
                isAuthorized={isAuthorized}
                onAuthNavigate={navigateToAuth}
                onLocaleToggle={handleLocaleToggle}
                onThemeToggle={handleThemeToggle}
                onAuthorizationToggle={setAuthorized}
              />
            )}
            <main
              className={
                isAuthorized
                  ? styles.authorizedShell
                  : route === 'auth'
                    ? styles.authRoute
                    : styles.landingLayout
              }
            >
              {isAuthorized ? (
                <>
                  <WidgetsGalleryPage
                    locale={locale}
                    theme={theme}
                    widgets={visibleWidgets}
                    isLanguageLoading={isLocaleTransitioning}
                    onLocaleToggle={handleLocaleToggle}
                    onThemeToggle={handleThemeToggle}
                    onCreateWidget={() => undefined}
                    onLogout={() => setAuthorized(false)}
                    onDeleteWidget={(title) =>
                      setVisibleWidgets((currentWidgets) =>
                        currentWidgets.filter((currentWidget) => currentWidget.title !== title),
                      )
                    }
                  />
                </>
              ) : route === 'auth' ? (
                <AuthPage authTab={authTab} locale={locale} onAuthTabChange={setAuthTab} />
              ) : (
                <LandingPage locale={locale} onAuthNavigate={navigateToAuth} />
              )}
            </main>
          </motion.div>
        </AnimatePresence>
        <ThemeReveal reveal={themeReveal} onComplete={() => setThemeReveal(null)} />
      </div>
    </ThemeProvider>
  );
};
