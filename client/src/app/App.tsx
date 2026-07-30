import { Button, Card, Switch, Tab, TabList, TextInput, ThemeProvider } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';

import {
  APP_LOCALE_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  getSystemLocale,
  getSystemTheme,
  messages,
  widgets,
  type AppTheme,
  type Locale,
} from './config';
import styles from './App.module.css';
import './Theme.module.css';

type AuthTab = 'signin' | 'signup';

const accentClass = {
  lavender: styles.accentLavender,
  mint: styles.accentMint,
  blue: styles.accentBlue,
  violet: styles.accentViolet,
} as const;

export const App = () => {
  const [theme, setTheme] = useState<AppTheme>(
    () => (localStorage.getItem(APP_THEME_STORAGE_KEY) as AppTheme) || getSystemTheme(),
  );
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem(APP_LOCALE_STORAGE_KEY) as Locale) || getSystemLocale(),
  );
  const [isAuthorized, setAuthorized] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('signin');
  const t = messages[locale];

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
        {!isAuthorized && (
          <header className={`${styles.glass} ${styles.headerPanel}`}>
            <Button href="#auth-form" view="outlined" size="xl">
              {t.authCta}
            </Button>
            <div className={styles.headerControls}>
              <Button
                size="xl"
                type="button"
                view="outlined"
                onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}
              >
                {locale.toUpperCase()}
              </Button>
              <Switch
                checked={theme === 'dark'}
                onUpdate={(checked) => setTheme(checked ? 'dark' : 'light')}
                content={theme}
              />
              <Switch checked={isAuthorized} onUpdate={setAuthorized} content={t.demoAuth} />
            </div>
          </header>
        )}

        <main className={isAuthorized ? styles.authorizedShell : styles.landingLayout}>
          {isAuthorized ? (
            <section className={styles.galleryPage} id="widgets-gallery">
              <div className={`${styles.galleryHeading} ${styles.glass}`}>
                <div>
                  <p className={styles.eyebrow}>{t.gallery}</p>
                  <h1>{t.widgets}</h1>
                </div>
                <Button view="action" size="l">
                  {t.createWidget}
                </Button>
              </div>
              <div className={`${styles.widgetGrid} ${styles.widgetGalleryGrid}`}>
                {widgets.map((widget) => (
                  <Card
                    key={widget.title}
                    className={`${styles.glass} ${styles.widgetCard} ${accentClass[widget.accent]}`}
                    view="clear"
                  >
                    <div className={styles.widgetPreview}>
                      <span>{widget.metric}</span>
                    </div>
                    <div className={styles.widgetMeta}>
                      <div>
                        <h3>{widget.title}</h3>
                        <p>{widget.source}</p>
                      </div>
                      <span className={styles.glassPill}>
                        {widget.status === 'active' ? t.active : t.draft}
                      </span>
                    </div>
                    <p className={styles.widgetDate}>{t.updated}: 30 Jul</p>
                    <div className={styles.cardActions}>
                      <Button view="outlined">{t.open}</Button>
                      <Button view="outlined">{t.configure}</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className={`${styles.heroPanel} ${styles.glass}`}>
                <p className={styles.eyebrow}>{t.eyebrow}</p>
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
                <div className={styles.heroActions}>
                  <div className={styles.heroStats}>
                    <span className={styles.glassPill}>Glass UI</span>
                    <span className={styles.glassPill}>Gravity UI</span>
                    <span className={styles.glassPill}>Lavender theme</span>
                  </div>
                  <Button href="#auth-form" view="action" size="xl">
                    {t.authCta}
                  </Button>
                </div>
              </section>
              <Card
                className={`${styles.glass} ${styles.authCard} ${authTab === 'signin' ? styles.authCardSignin : styles.authCardSignup}`}
                view="clear"
                id="auth-form"
              >
                <div className={styles.authAbstract} aria-hidden="true">
                  <div className={`${styles.abstractWindow} ${styles.abstractWindowMain}`}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className={`${styles.abstractWindow} ${styles.abstractWindowSmall}`} />
                </div>
                <div className={styles.authContent}>
                  <div
                    key={`${authTab}-heading`}
                    className={`${styles.authHeading} ${styles.authFormAnimated}`}
                  >
                    <h2>{authTab === 'signin' ? t.signinTitle : t.signupTitle}</h2>
                    <p>{authTab === 'signin' ? t.signinSubtitle : t.signupSubtitle}</p>
                  </div>
                  <TabList
                    value={authTab}
                    onUpdate={(value) => setAuthTab(value as AuthTab)}
                    size="l"
                  >
                    <Tab value="signin">{t.signin}</Tab>
                    <Tab value="signup">{t.signup}</Tab>
                  </TabList>
                  <div key={authTab} className={`${styles.authForm} ${styles.authFormAnimated}`}>
                    <Button view="outlined-action" size="xl" width="max">
                      <span className={styles.yandexMark}>Я</span>
                      {t.oauthYandex}
                    </Button>
                    <div className={styles.authDivider}>
                      <span>{t.orEmail}</span>
                    </div>
                    {authTab === 'signup' && <TextInput size="l" placeholder={t.name} />}
                    <TextInput size="l" placeholder={t.email} />
                    <TextInput size="l" placeholder={t.password} type="password" />
                    <Button view="action" size="xl" width="max">
                      {t.continue}
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
};
