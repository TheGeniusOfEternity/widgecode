import { Button, TextInput } from '@gravity-ui/uikit';
import { useState, type FormEvent } from 'react';

import { apiClient, getApiErrorMessage } from '@/shared/api';
import { useHashToken } from '@/shared/lib/hashToken';
import { messages, type Locale } from '@/shared/locale/content';
import { AuthCard, type AuthCardNotice } from '@/shared/ui/auth-card/AuthCard';

export const ResetPasswordPage = ({
  locale,
  onDone,
  onRequestNewLink,
}: {
  locale: Locale;
  /** Called after the password is saved; the user signs in again. */
  onDone: () => void;
  onRequestNewLink: () => void;
}) => {
  const t = messages[locale];
  const token = useHashToken();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<AuthCardNotice | null>(
    token ? null : { tone: 'error', text: t.resetLinkInvalid },
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== repeat) {
      setNotice({ tone: 'error', text: t.passwordsDontMatch });
      return;
    }
    if (password.length < 6) {
      setNotice({ tone: 'error', text: t.authPasswordTooShort });
      return;
    }
    setSubmitting(true);
    try {
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
        skipAuthRefresh: true,
      });
      onDone();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setNotice({
        tone: 'error',
        text: message.includes('invalid or has expired') ? t.resetLinkInvalid : message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      eyebrow="WidgeCode"
      title={t.resetPasswordTitle}
      subtitle={t.resetPasswordSubtitle}
      notice={notice}
    >
      {token ? (
        <form onSubmit={submit}>
          <TextInput
            size="l"
            type="password"
            placeholder={t.newPassword}
            value={password}
            onUpdate={setPassword}
            autoComplete="new-password"
          />
          <TextInput
            size="l"
            type="password"
            placeholder={t.repeatPassword}
            value={repeat}
            onUpdate={setRepeat}
            autoComplete="new-password"
          />
          <Button view="action" size="xl" width="max" type="submit" loading={isSubmitting}>
            {t.savePassword}
          </Button>
        </form>
      ) : (
        <Button view="action" size="xl" width="max" onClick={onRequestNewLink}>
          {t.sendResetLink}
        </Button>
      )}
    </AuthCard>
  );
};
