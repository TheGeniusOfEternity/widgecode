import { isEmailEnabled, sendEmail } from '@server/lib/mailer.js';

const message = { to: 'person@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };
const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('is disabled in production until Resend is configured', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;

  expect(isEmailEnabled()).toBe(false);
  await expect(sendEmail(message)).rejects.toThrow('Email is not configured');
});

it('logs emails instead of sending them in development', async () => {
  process.env.NODE_ENV = 'development';
  delete process.env.RESEND_API_KEY;
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn());

  expect(isEmailEnabled()).toBe(true);
  await sendEmail(message);

  expect(log).toHaveBeenCalledWith(expect.stringContaining('to=person@example.com'));
  expect(fetch).not.toHaveBeenCalled();
});

it('sends through the Resend API when configured', async () => {
  process.env.NODE_ENV = 'production';
  process.env.RESEND_API_KEY = 're_test';
  process.env.EMAIL_FROM = 'WidgeCode <noreply@example.ru>';
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);

  expect(isEmailEnabled()).toBe(true);
  await sendEmail(message);

  expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer re_test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'WidgeCode <noreply@example.ru>', ...message }),
  });
});

it('surfaces Resend errors', async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.EMAIL_FROM = 'noreply@example.ru';
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => 'domain not verified' }),
  );

  await expect(sendEmail(message)).rejects.toThrow('Resend returned 422: domain not verified');
});
