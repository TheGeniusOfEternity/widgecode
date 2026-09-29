// Email transport. Resend when RESEND_API_KEY and EMAIL_FROM are set; otherwise, outside
// production, emails are printed to the server log so the flows can be tested locally. In
// production without credentials email is disabled and the features that need it are hidden.

export type EmailMessage = { to: string; subject: string; html: string; text: string };

const resendConfig = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
};

export const isEmailEnabled = () =>
  Boolean(resendConfig()) || process.env.NODE_ENV !== 'production';

export const sendEmail = async (message: EmailMessage) => {
  const config = resendConfig();
  if (!config) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not configured');
    console.info(`[email] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.from, ...message }),
  });
  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
  }
};
