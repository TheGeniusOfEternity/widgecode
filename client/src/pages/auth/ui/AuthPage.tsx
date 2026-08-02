import { Button, Card, Tab, TabList, TextInput } from '@gravity-ui/uikit';
import { useState, type FormEvent } from 'react';

import { messages, type Locale } from '@/shared/locale/content';
import glassStyles from '@/shared/ui/glass/Glass.module.css';
import styles from '@/pages/auth/ui/AuthPage.module.css';

export type AuthTab = 'signin' | 'signup';

const localizeAuthError = (error: string, locale: Locale) => {
  const t = messages[locale];
  const knownErrors: Record<string, string> = {
    'Enter a valid email': t.authInvalidEmail,
    'Password must contain at least 6 characters': t.authPasswordTooShort,
    'Invalid email or password': t.authInvalidCredentials,
    'An account with this email already exists': t.authEmailExists,
  };
  return knownErrors[error] ?? error;
};

type AuthPageProps = {
  authTab: AuthTab;
  locale: Locale;
  onAuthTabChange: (tab: AuthTab) => void;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (values: { email: string; password: string; name?: string }) => Promise<void>;
  onYandexAuth: () => void;
};

export const AuthPage = ({
  authTab,
  locale,
  onAuthTabChange,
  isSubmitting,
  error,
  onSubmit,
  onYandexAuth,
}: AuthPageProps) => {
  const t = messages[locale];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ email, password, name: authTab === 'signup' ? name : undefined });
  };

  return (
    <Card
      className={`${glassStyles.glass} ${styles.authCard} ${authTab === 'signin' ? styles.authCardSignin : styles.authCardSignup}`}
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
        <TabList value={authTab} onUpdate={(value) => onAuthTabChange(value as AuthTab)} size="l">
          <Tab value="signin">{t.signin}</Tab>
          <Tab value="signup">{t.signup}</Tab>
        </TabList>
        <form
          key={authTab}
          className={`${styles.authForm} ${styles.authFormAnimated}`}
          onSubmit={handleSubmit}
        >
          <Button view="outlined-action" size="xl" width="max" type="button" onClick={onYandexAuth}>
            <span className={styles.yandexMark}>Я</span>
            {t.oauthYandex}
          </Button>
          <div className={styles.authDivider}>
            <span>{t.orEmail}</span>
          </div>
          {authTab === 'signup' && (
            <TextInput size="l" placeholder={t.name} value={name} onUpdate={setName} />
          )}
          <TextInput
            size="l"
            placeholder={t.email}
            value={email}
            onUpdate={setEmail}
            type="email"
          />
          <TextInput
            size="l"
            placeholder={t.password}
            value={password}
            onUpdate={setPassword}
            type="password"
          />
          <div className={styles.authErrorSlot} aria-live="polite">
            {error && (
              <p className={styles.authError} role="alert">
                {localizeAuthError(error, locale)}
              </p>
            )}
          </div>
          <Button view="action" size="xl" width="max" type="submit" loading={isSubmitting}>
            {t.continue}
          </Button>
        </form>
      </div>
    </Card>
  );
};
