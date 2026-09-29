import { Button, TextInput } from '@gravity-ui/uikit';
import { useState, type FormEvent } from 'react';

import { apiClient, getApiErrorMessage } from '@/shared/api';
import { messages, type Locale } from '@/shared/locale/content';
import { AuthCard, type AuthCardNotice } from '@/shared/ui/auth-card/AuthCard';

export const ForgotPasswordPage = ({
  locale,
  onBackToSignin,
}: {
  locale: Locale;
  onBackToSignin: () => void;
}) => {
  const t = messages[locale];
  const [email, setEmail] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<AuthCardNotice | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, locale }),
        skipAuthRefresh: true,
      });
      setNotice({ tone: 'success', text: t.resetLinkSent });
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      eyebrow="WidgeCode"
      title={t.forgotPasswordTitle}
      subtitle={t.forgotPasswordSubtitle}
      notice={notice}
    >
      <form onSubmit={submit}>
        <TextInput
          size="l"
          type="email"
          placeholder={t.email}
          value={email}
          onUpdate={setEmail}
          autoComplete="email"
        />
        <Button view="action" size="xl" width="max" type="submit" loading={isSubmitting}>
          {t.sendResetLink}
        </Button>
        <Button view="flat" size="l" width="max" onClick={onBackToSignin}>
          {t.backToSignin}
        </Button>
      </form>
    </AuthCard>
  );
};
