import { ThemeProvider } from '@gravity-ui/uikit';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';

import { useAuthStore } from '@/features/auth';
import type { WidgetCardData, Widget } from '@/entities/widget';
import { AuthPage, type AuthTab } from '@/pages/auth';
import { LandingHeader, LandingPage } from '@/pages/landing';
import { WidgetsGalleryPage } from '@/pages/widgets-gallery';
import { PublicWidgetPage } from '@/pages/public-widget';
import { WidgetEditorPage } from '@/pages/widget-editor';
import {
  createWidget,
  deleteWidget,
  getPublicWidgetUrl,
  listWidgets,
  API_BASE_URL,
  type CreateWidgetInput,
} from '@/shared/api';
import { AuthTransitionLoader } from '@/shared/ui/auth-transition-loader/AuthTransitionLoader';
import {
  APP_LOCALE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  getSystemLocale,
  getSystemTheme,
  type AppTheme,
  type Locale,
} from '@/app/config';
import { ThemeReveal, type ThemeRevealState } from '@/shared/ui/theme-reveal';
import styles from '@/app/App.module.css';
import '@/app/Theme.css';

type AppRoute = 'landing' | 'auth' | 'dashboard' | 'editor' | 'public' | 'callback';

const getRoute = (): AppRoute => {
  if (window.location.pathname === '/dashboard') return 'dashboard';
  if (/^\/widgets\/[^/]+$/.test(window.location.pathname)) return 'editor';
  if (/^\/w\/[^/]+$/.test(window.location.pathname)) return 'public';
  if (window.location.pathname === '/auth/callback') return 'callback';
  if (['/auth', '/login', '/register'].includes(window.location.pathname)) return 'auth';
  return 'landing';
};

const getRouteParam = (prefix: string) => window.location.pathname.slice(prefix.length) || null;

const toCardData = (widget: Widget): WidgetCardData => {
  const hasGithub = widget.blocks.some((block) => block.type.startsWith('github'));
  const hasLeetcode = widget.blocks.some((block) => block.type.startsWith('leetcode'));
  const source =
    hasGithub && hasLeetcode ? 'GitHub + LeetCode' : hasLeetcode ? 'LeetCode' : 'GitHub';
  const metric = widget.blocks.some((block) => block.type === 'leetcode-stats')
    ? 'LC'
    : widget.blocks.some((block) => block.type === 'github-langs')
      ? 'TS'
      : 'GH';
  return {
    id: widget.id,
    title: widget.title,
    slug: widget.slug,
    source,
    metric,
    accent: widget.config?.palette ?? 'lavender',
    paletteMode: widget.config?.paletteMode ?? 'auto',
    public: widget.public,
    width: widget.width,
    height: widget.height,
    updatedAt: widget.updatedAt,
  };
};

const getAuthTab = (): AuthTab => (window.location.pathname === '/register' ? 'signup' : 'signin');

const getOAuthToken = () => {
  if (window.location.pathname !== '/auth/callback') return null;
  return new URLSearchParams(window.location.hash.slice(1)).get('access_token');
};

const getDocumentTitle = (route: AppRoute, authTab: AuthTab) => {
  if (route === 'auth')
    return authTab === 'signup' ? 'WidgeCode | Register' : 'WidgeCode | Sign in';
  if (route === 'dashboard') return 'WidgeCode | Dashboard';
  if (route === 'editor') return 'WidgeCode | Widget editor';
  if (route === 'public') return 'WidgeCode | Public widget';
  if (route === 'callback') return 'WidgeCode | Sign in';
  return 'WidgeCode';
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
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetCardData[]>([]);
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
      if (getRoute() === 'public') {
        setBootstrapped(true);
        return;
      }
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
    if (authStatus !== 'authenticated' || (route !== 'dashboard' && route !== 'editor')) return;
    let cancelled = false;
    void listWidgets()
      .then((nextWidgets) => {
        if (!cancelled) setVisibleWidgets(nextWidgets.map(toCardData));
      })
      .catch(() => {
        if (!cancelled) setVisibleWidgets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, route]);

  useEffect(() => {
    if (
      isBootstrapped &&
      !isLoggingOut &&
      (route === 'dashboard' || route === 'editor') &&
      authStatus === 'unauthenticated'
    ) {
      window.location.replace('/login');
    }
  }, [authStatus, isBootstrapped, isLoggingOut, route]);

  useEffect(() => {
    if (!isBootstrapped || authStatus !== 'authenticated' || route !== 'auth') return;
    window.location.replace('/dashboard');
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

  const handleCreateWidget = async (input: CreateWidgetInput) => {
    const widget = await createWidget(input);
    setVisibleWidgets((currentWidgets) => [toCardData(widget), ...currentWidgets]);
    navigate(`/widgets/${widget.id}`);
  };

  const handleDeleteWidget = async (id: string) => {
    await deleteWidget(id);
    setVisibleWidgets((currentWidgets) => currentWidgets.filter((widget) => widget.id !== id));
  };

  const handleCopyWidget = async (widget: WidgetCardData) => {
    const src = getPublicWidgetUrl(widget.slug, true);
    const code = `<iframe src="${src}" width="${widget.width}" height="${widget.height}" frameborder="0" style="display:block;border:0" loading="lazy"></iframe>`;
    await navigator.clipboard?.writeText(code);
  };

  useEffect(() => {
    localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    document.title = getDocumentTitle(route, authTab);
  }, [authTab, route]);

  const isAuthorized = authStatus === 'authenticated';
  const isEmbedRoute =
    route === 'public' && new URLSearchParams(window.location.search).get('embed') === '1';

  useEffect(() => {
    document.documentElement.dataset.embed = isEmbedRoute ? 'true' : 'false';
    document.body.dataset.embed = isEmbedRoute ? 'true' : 'false';
  }, [isEmbedRoute]);

  if (isEmbedRoute)
    return (
      <ThemeProvider theme={theme}>
        <PublicWidgetPage slug={getRouteParam('/w/') ?? ''} locale={locale} embed />
      </ThemeProvider>
    );
  const isRedirectingFromPrivateRoute =
    isBootstrapped &&
    (route === 'dashboard' || route === 'editor') &&
    authStatus === 'unauthenticated';
  const isRedirectingFromAuthRoute =
    isBootstrapped && route === 'auth' && authStatus === 'authenticated';
  const isAuthTransitioning =
    !isBootstrapped ||
    isLoggingOut ||
    route === 'callback' ||
    isRedirectingFromPrivateRoute ||
    isRedirectingFromAuthRoute;
  const oauthError =
    route === 'auth' && new URLSearchParams(window.location.search).has('oauth_error')
      ? locale === 'ru'
        ? 'Не удалось войти через Яндекс. Попробуйте ещё раз.'
        : 'Yandex sign-in failed. Please try again.'
      : null;
  const username =
    authUser?.name || authUser?.email?.split('@')[0] || (locale === 'ru' ? 'Профиль' : 'Profile');
  const isDashboardRoute = isAuthorized && route === 'dashboard';
  const authorizedContent =
    route === 'dashboard' ? (
      <WidgetsGalleryPage
        locale={locale}
        theme={theme}
        username={username}
        widgets={visibleWidgets}
        isLanguageLoading={isLocaleTransitioning}
        onLocaleToggle={handleLocaleToggle}
        onThemeToggle={handleThemeToggle}
        onCreateWidget={handleCreateWidget}
        onOpenWidget={(id) => navigate(`/widgets/${id}`)}
        onOpenPreview={(widget) =>
          navigate(widget.public ? `/w/${widget.slug}` : `/widgets/${widget.id}`)
        }
        onCopyWidget={handleCopyWidget}
        onLogout={handleLogout}
        onDeleteWidget={(id) => void handleDeleteWidget(id)}
      />
    ) : (
      <WidgetEditorPage
        widgetId={getRouteParam('/widgets/') ?? ''}
        locale={locale}
        onBack={() => navigate('/dashboard')}
        onOpenPublic={(slug) => navigate(`/w/${slug}`)}
      />
    );

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
                  isDashboardRoute
                    ? styles.authorizedShell
                    : route === 'auth' || route === 'dashboard' || route === 'editor'
                      ? styles.authRoute
                      : route === 'public'
                        ? styles.publicRoute
                        : styles.landingLayout
                }
              >
                {isDashboardRoute ? (
                  authorizedContent
                ) : route === 'editor' && isAuthorized ? (
                  <div className={styles.authorizedContent}>{authorizedContent}</div>
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
                ) : route === 'public' ? (
                  <PublicWidgetPage
                    slug={getRouteParam('/w/') ?? ''}
                    locale={locale}
                    embed={isEmbedRoute}
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
