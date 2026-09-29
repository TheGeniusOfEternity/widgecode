import { Button } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';

import { apiClient } from '@/shared/api';
import { useHashToken } from '@/shared/lib/hashToken';
import { messages, type Locale } from '@/shared/locale/content';
import { AuthCard, type AuthCardNotice } from '@/shared/ui/auth-card/AuthCard';

// Tokens are single-use: share one request per token so a re-run effect (StrictMode, remount)
// doesn't consume it twice and report the second attempt as a failure.
const verifications = new Map<string, Promise<unknown>>();

const verifyOnce = (token: string) => {
  let request = verifications.get(token);
  if (!request) {
    request = apiClient('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
      skipAuthRefresh: true,
    });
    verifications.set(token, request);
  }
  return request;
};

export const VerifyEmailPage = ({
  locale,
  onContinue,
}: {
  locale: Locale;
  onContinue: () => void;
}) => {
  const t = messages[locale];
  const token = useHashToken();
  const [notice, setNotice] = useState<AuthCardNotice | null>(
    token ? null : { tone: 'error', text: t.verifyLinkInvalid },
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyOnce(token)
      .then(() => !cancelled && setNotice({ tone: 'success', text: t.emailConfirmed }))
      .catch(() => !cancelled && setNotice({ tone: 'error', text: t.verifyLinkInvalid }));
    return () => {
      cancelled = true;
    };
  }, [t.emailConfirmed, t.verifyLinkInvalid, token]);

  return (
    <AuthCard
      eyebrow="WidgeCode"
      title={t.verifyEmailTitle}
      subtitle={notice ? undefined : t.verifyingEmail}
      notice={notice}
    >
      {notice && (
        <Button view="action" size="xl" width="max" onClick={onContinue}>
          {t.goToWidgets}
        </Button>
      )}
    </AuthCard>
  );
};
