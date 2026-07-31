import { ThemeProvider } from '@gravity-ui/uikit';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';

import { useAuthStore } from '../features/auth';
import type { WidgetCardData } from '../entities/widget';
import { AuthPage, type AuthTab } from '../pages/auth';
import { LandingHeader, LandingPage } from '../pages/landing';
import { WidgetsGalleryPage } from '../pages/widgets-gallery';
import { API_BASE_URL } from '../shared/api';
import { widgets } from '../shared/locale/content';
import { AuthTransitionLoader } from '../shared/ui/auth-transition-loader/AuthTransitionLoader';
import {
  APP_LOCALE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  getSystemLocale,
  getSystemTheme,
  type AppTheme,
  type Locale,
} from './config';
import { ThemeReveal, type ThemeRevealState } from '../shared/ui/theme-reveal';
import styles from './App.module.css';
import './Theme.css';

type AppRoute = 'landing' | 'auth' | 'dashboard' | 'callback';

const getRoute = (): AppRoute => {
  if (window.location.pathname === '/dashboard') return 'dashboard';
  if (window.location.pathname === '/auth/callback') return 'callback';
  if (['/auth', '/login', '/register'].includes(window.location.pathname)) return 'auth';
  return 'landing';
};

const getAuthTab = (): AuthTab => (window.location.pathname === '/register' ? 'signup' : 'signin');

const getOAuthToken = () => {
  if (window.location.pathname !== '/auth/callback') return null;
  return new URLSearchParams(window.location.hash.slice(1)).get('access_token');
};

export const App = () => {
  const [theme, setTheme] = useState<AppTheme>(
    () => (localStorage.getItem(APP_THEME_STORAGE_KEY) as AppTheme) || getSystemTheme(),
  );
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem(APP_LOCALE_STORAGE_KEY) as Locale) || getSystemLocale(),
  );
  const [route, setRoute] = useState<AppRoute>(getRoute);
  const [authTab, setAuthTab] = useState<AuthTab>(getAuthTab);
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetCardData[]>(() => [...widgets]);
  const [themeReveal, setThemeReveal] = useState<ThemeRevealState | null>(null);
  const [isLocaleTransitioning, setLocaleTransitioning] = useState(false);
  const [isBootstrapped, setBootstrapped] = useState(false);
  const [isLoggingOut, setLoggingOut] = useState(false);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const authError = useAuthStore((state) => state.error);
  const prefersReducedMotion = useReducedMotion();

  const navigate = useCallback((path: string, replace = false) => {
    if (replace) window.history.replaceState({}, '', path);
    else window.history.pushState({}, '', path);
    setRoute(getRoute());
    setAuthTab(getAuthTab());
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRoute());
      setAuthTab(getAuthTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const oauthToken = getOAuthToken();
      try {
        if (oauthToken) {
          await useAuthStore.getState().completeOAuth(oauthToken);
          if (!cancelled) navigate('/dashboard', true);
        } else {
          await useAuthStore.getState().checkAuth();
          if (!cancelled && getRoute() === 'callback') {
            navigate(
              useAuthStore.getState().status === 'authenticated' ? '/dashboard' : '/login',
              true,
            );
          }
        }
      } catch {
        if (!cancelled) navigate('/login', true);
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (isBootstrapped && route === 'dashboard' && authStatus === 'unauthenticated') {
      window.location.replace('/login');
    }
  }, [authStatus, isBootstrapped, route]);

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

  const handleAuthTabChange = (nextTab: AuthTab) => {
    useAuthStore.getState().clearError();
    setAuthTab(nextTab);
    navigate(nextTab === 'signin' ? '/login' : '/register');
  };

  const handleAuthSubmit = async (values: { email: string; password: string; name?: string }) => {
    try {
      if (authTab === 'signin') {
        await useAuthStore.getState().login(values.email, values.password);
      } else {
        await useAuthStore.getState().register(values.email, values.password, values.name);
      }
      navigate('/dashboard');
    } catch {
      // The store exposes the server error to the form.
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await useAuthStore.getState().logout();
    } catch {
      // The local auth state is cleared by the store even if the API is unavailable.
    } finally {
      navigate('/');
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const isAuthorized = authStatus === 'authenticated';
  const isAuthTransitioning = !isBootstrapped || isLoggingOut || route === 'callback';
  const oauthError =
    route === 'auth' && new URLSearchParams(window.location.search).has('oauth_error')
      ? locale === 'ru'
        ? 'Не удалось войти через Яндекс. Попробуйте ещё раз.'
        : 'Yandex sign-in failed. Please try again.'
      : null;
  const username = authUser?.name || authUser?.email || (locale === 'ru' ? 'Профиль' : 'Profile');

  return (
    <ThemeProvider theme={theme}>
      <div className={styles.appShell}>
        <div className={`${styles.orb} ${styles.orbLavender}`} />
        <div className={`${styles.orb} ${styles.orbBlue}`} />
        {isAuthTransitioning ? (
          <AuthTransitionLoader locale={locale} reducedMotion={Boolean(prefersReducedMotion)} />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className={styles.motionDiv}
              key={route}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              {route === 'landing' && (
                <LandingHeader
                  locale={locale}
                  theme={theme}
                  isAuthorized={isAuthorized}
                  onAuthNavigate={() => navigate('/register')}
                  onDashboardNavigate={() => navigate('/dashboard')}
                  onLogout={handleLogout}
                  onLocaleToggle={handleLocaleToggle}
                  onThemeToggle={handleThemeToggle}
                />
              )}
              <main
                className={
                  route === 'dashboard' && isAuthorized
                    ? styles.authorizedShell
                    : route === 'auth' || route === 'dashboard'
                      ? styles.authRoute
                      : styles.landingLayout
                }
              >
                {route === 'dashboard' ? (
                  isAuthorized ? (
                    <WidgetsGalleryPage
                      locale={locale}
                      theme={theme}
                      username={username}
                      widgets={visibleWidgets}
                      isLanguageLoading={isLocaleTransitioning}
                      onLocaleToggle={handleLocaleToggle}
                      onThemeToggle={handleThemeToggle}
                      onCreateWidget={() => undefined}
                      onLogout={handleLogout}
                      onDeleteWidget={(title) =>
                        setVisibleWidgets((currentWidgets) =>
                          currentWidgets.filter((currentWidget) => currentWidget.title !== title),
                        )
                      }
                    />
                  ) : (
                    <div>
                      {locale === 'ru' ? 'Проверяем авторизацию…' : 'Checking authentication…'}
                    </div>
                  )
                ) : route === 'auth' ? (
                  <AuthPage
                    authTab={authTab}
                    locale={locale}
                    onAuthTabChange={handleAuthTabChange}
                    isSubmitting={authStatus === 'loading'}
                    error={authError || oauthError}
                    onSubmit={handleAuthSubmit}
                    onYandexAuth={() => window.location.assign(`${API_BASE_URL}/auth/yandex`)}
                  />
                ) : (
                  <LandingPage
                    locale={locale}
                    isAuthorized={isAuthorized}
                    onAuthNavigate={() =>
                      isAuthorized ? navigate('/dashboard') : navigate('/register')
                    }
                  />
                )}
              </main>
            </motion.div>
          </AnimatePresence>
        )}
        <ThemeReveal reveal={themeReveal} onComplete={() => setThemeReveal(null)} />
      </div>
    </ThemeProvider>
  );
};
