import type { EmailMessage } from '@server/lib/mailer.js';

export type EmailLocale = 'ru' | 'en';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

const layout = (
  title: string,
  body: string,
  action: { label: string; url: string },
) => `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f5f2ec;font-family:Inter,Arial,sans-serif;color:#27213d">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fbf9ff;border:1px solid #e4dcff;border-radius:24px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 8px;color:#8f71e8;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">WidgeCode</p>
        <h1 style="margin:0 0 16px;font-size:24px;letter-spacing:-.04em">${escapeHtml(title)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5">${body}</p>
        <a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 20px;border-radius:14px;background:#8f71e8;color:#fff;font-weight:700;text-decoration:none">${escapeHtml(action.label)}</a>
        <p style="margin:24px 0 0;color:#6b6480;font-size:12px;line-height:1.5">${escapeHtml(action.url)}</p>
      </td></tr>
    </table>
  </body>
</html>`;

const copy = {
  ru: {
    reset: {
      subject: 'Сброс пароля WidgeCode',
      title: 'Сброс пароля',
      body: 'Кто-то запросил сброс пароля для вашего аккаунта. Ссылка действует 1 час. Если это были не вы, просто проигнорируйте письмо.',
      action: 'Задать новый пароль',
    },
    verify: {
      subject: 'Подтвердите email для WidgeCode',
      title: 'Подтвердите email',
      body: 'Подтвердите, что этот адрес принадлежит вам. Ссылка действует 24 часа.',
      action: 'Подтвердить email',
    },
  },
  en: {
    reset: {
      subject: 'Reset your WidgeCode password',
      title: 'Reset your password',
      body: "Someone asked to reset the password for your account. The link is valid for 1 hour. If it wasn't you, just ignore this email.",
      action: 'Set a new password',
    },
    verify: {
      subject: 'Confirm your email for WidgeCode',
      title: 'Confirm your email',
      body: 'Confirm that this address belongs to you. The link is valid for 24 hours.',
      action: 'Confirm email',
    },
  },
} as const;

const message = (
  to: string,
  template: (typeof copy)[EmailLocale][keyof (typeof copy)['en']],
  url: string,
): EmailMessage => ({
  to,
  subject: template.subject,
  html: layout(template.title, escapeHtml(template.body), { label: template.action, url }),
  text: `${template.title}\n\n${template.body}\n\n${template.action}: ${url}`,
});

export const passwordResetEmail = (to: string, url: string, locale: EmailLocale) =>
  message(to, copy[locale].reset, url);

export const emailVerificationEmail = (to: string, url: string, locale: EmailLocale) =>
  message(to, copy[locale].verify, url);
