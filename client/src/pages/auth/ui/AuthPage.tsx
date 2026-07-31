import { Button, Card, Tab, TabList, TextInput } from '@gravity-ui/uikit';

import { messages, type Locale } from '../../../shared/locale/content';
import glassStyles from '../../../shared/ui/glass/Glass.module.css';
import styles from './AuthPage.module.css';

export type AuthTab = 'signin' | 'signup';

type AuthPageProps = {
  authTab: AuthTab;
  locale: Locale;
  onAuthTabChange: (tab: AuthTab) => void;
};

export const AuthPage = ({ authTab, locale, onAuthTabChange }: AuthPageProps) => {
  const t = messages[locale];

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
  );
};
