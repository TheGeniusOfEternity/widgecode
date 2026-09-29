import { ArrowLeft, CircleCheck, Envelope, Key, Person } from '@gravity-ui/icons';
import { Button, Icon } from '@gravity-ui/uikit';
import { useEffect, useState, type ReactNode } from 'react';

import { useAuthFeatures, type AuthUser } from '@/features/auth';
import { API_BASE_URL, apiClient, getApiErrorMessage } from '@/shared/api';
import { messages, type Locale } from '@/shared/locale/content';
import { ErrorPage } from '@/widgets/error-page';
import styles from '@/pages/account/ui/AccountPage.module.css';

type SignInMethods = { password: boolean; yandex: boolean };
type Account = { user: AuthUser; methods: SignInMethods; emailVerified: boolean };
type Notice = { tone: 'success' | 'error'; text: string };

type AccountPageProps = {
  locale: Locale;
  onBack: () => void;
};

const noticeFromUrl = (t: (typeof messages)[Locale]): Notice | null => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('linked') === 'yandex') return { tone: 'success', text: t.yandexLinked };
  const error = params.get('link_error');
  if (error === 'yandex_taken') return { tone: 'error', text: t.yandexTaken };
  if (error === 'session_expired') return { tone: 'error', text: t.linkSessionExpired };
  if (error) return { tone: 'error', text: t.yandexLinkFailed };
  return null;
};

const MethodRow = ({
  icon,
  title,
  status,
  connected,
  action,
}: {
  icon: ReactNode;
  title: string;
  status: string;
  connected: boolean;
  action?: ReactNode;
}) => (
  <li className={styles.method}>
    <span className={styles.methodIcon}>{icon}</span>
    <span className={styles.methodCopy}>
      <strong>{title}</strong>
      <span className={connected ? styles.connected : undefined}>
        {connected && <Icon data={CircleCheck} size={13} />}
        {status}
      </span>
    </span>
    {action}
  </li>
);

export const AccountPage = ({ locale, onBack }: AccountPageProps) => {
  const t = messages[locale];
  const [account, setAccount] = useState<Account | null>(null);
  const features = useAuthFeatures();
  const [isSendingVerification, setSendingVerification] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(() => noticeFromUrl(t));
  const [isUnlinking, setUnlinking] = useState(false);

  useEffect(() => {
    // The link result arrives as query params; drop them so a reload doesn't repeat the notice.
    if (window.location.search) window.history.replaceState({}, '', window.location.pathname);
    let cancelled = false;
    apiClient<Account>('/auth/me')
      .then((response) => {
        if (!cancelled) setAccount(response);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getApiErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unlinkYandex = async () => {
    setUnlinking(true);
    try {
      const { methods } = await apiClient<{ methods: SignInMethods }>('/auth/yandex', {
        method: 'DELETE',
      });
      setAccount((current) => (current ? { ...current, methods } : current));
      setNotice(null);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error) });
    } finally {
      setUnlinking(false);
    }
  };

  const resendVerification = async () => {
    setSendingVerification(true);
    try {
      await apiClient('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ locale }),
      });
      setNotice({ tone: 'success', text: t.verificationSent });
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error) });
    } finally {
      setSendingVerification(false);
    }
  };

  if (loadError)
    return (
      <ErrorPage
        code={500}
        locale={locale}
        detail={loadError}
        onHome={onBack}
        onRetry={() => window.location.reload()}
      />
    );

  const methods = account?.methods;
  const isOnlyMethod = Boolean(methods && Number(methods.password) + Number(methods.yandex) < 2);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <Button view="flat" onClick={onBack} aria-label={t.backToDashboard}>
          <Icon data={ArrowLeft} size={18} />
        </Button>
        <div>
          <p>{t.account}</p>
          <h1>{t.accountTitle}</h1>
        </div>
      </header>

      <div className={styles.card} aria-busy={!account}>
        <div className={styles.profile}>
          <span className={styles.avatar}>
            <Icon data={Person} size={22} />
          </span>
          <span>
            <strong>{account ? account.user.name || account.user.email || '—' : ' '}</strong>
            <span>{account?.user.email ?? ' '}</span>
          </span>
        </div>

        <div className={styles.sectionHeading}>
          <h2>{t.signInMethods}</h2>
          <p>{t.signInMethodsHint}</p>
        </div>

        {notice && (
          <p
            className={notice.tone === 'success' ? styles.noticeSuccess : styles.noticeError}
            role={notice.tone === 'error' ? 'alert' : 'status'}
          >
            {notice.text}
          </p>
        )}

        {methods ? (
          <ul className={styles.methods}>
            {account?.user.email && (
              <MethodRow
                icon={<Icon data={Envelope} size={18} />}
                title={`${t.emailAddress}: ${account.user.email}`}
                connected={account.emailVerified}
                status={account.emailVerified ? t.emailVerified : t.emailNotVerified}
                action={
                  !account.emailVerified &&
                  features?.email && (
                    <Button
                      view="outlined-action"
                      onClick={() => void resendVerification()}
                      loading={isSendingVerification}
                    >
                      {t.resendVerification}
                    </Button>
                  )
                }
              />
            )}
            <MethodRow
              icon={<Icon data={Key} size={18} />}
              title={t.passwordMethod}
              connected={methods.password}
              status={methods.password ? t.connected : t.notConnected}
            />
            <MethodRow
              icon={<span className={styles.yandexMark}>Я</span>}
              title={t.yandexMethod}
              connected={methods.yandex}
              status={
                methods.yandex && isOnlyMethod
                  ? t.onlySignInMethod
                  : methods.yandex
                    ? t.connected
                    : t.notConnected
              }
              action={
                methods.yandex ? (
                  !isOnlyMethod && (
                    <Button
                      view="outlined"
                      onClick={() => void unlinkYandex()}
                      loading={isUnlinking}
                    >
                      {t.disconnect}
                    </Button>
                  )
                ) : (
                  <Button
                    view="outlined-action"
                    onClick={() =>
                      window.location.assign(`${API_BASE_URL}/auth/yandex?intent=link`)
                    }
                  >
                    {t.connect}
                  </Button>
                )
              }
            />
          </ul>
        ) : (
          <div className={styles.methodsSkeleton} aria-hidden="true">
            <span />
            <span />
          </div>
        )}
      </div>
    </section>
  );
};
