import { createHash } from 'node:crypto';

import request from 'supertest';

import { createApp } from '@server/app.js';

const prismaMocks = vi.hoisted(() => ({
  user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  authSession: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  authToken: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
const mailer = vi.hoisted(() => ({ enabled: true, sent: [] as { to: string; text: string }[] }));

vi.mock('@server/lib/prisma.js', () => ({ prisma: prismaMocks }));
vi.mock('@server/lib/mailer.js', () => ({
  isEmailEnabled: () => mailer.enabled,
  sendEmail: vi.fn(async (message: { to: string; text: string }) => {
    mailer.sent.push(message);
  }),
}));

const app = createApp();
const user = {
  id: 'user-1',
  email: 'person@example.com',
  name: null,
  passwordHash: 'old-hash',
  yandexId: null,
  emailVerifiedAt: null,
};
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const tokenFromLastEmail = () => {
  const match = mailer.sent.at(-1)?.text.match(/#token=([0-9a-f]+)/);
  if (!match) throw new Error('No token in the last email');
  return match[1];
};

beforeEach(() => {
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.CLIENT_URL = 'http://localhost:5173';
  vi.clearAllMocks();
  mailer.enabled = true;
  mailer.sent = [];
  prismaMocks.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  prismaMocks.authToken.updateMany.mockResolvedValue({ count: 1 });
});

it('reports whether email features are available', async () => {
  await request(app).get('/api/auth/features').expect(200, { email: true });
  mailer.enabled = false;
  await request(app).get('/api/auth/features').expect(200, { email: false });
});

describe('password reset', () => {
  it('emails a single-use link without revealing whether the account exists', async () => {
    prismaMocks.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(null);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'Person@Example.com', locale: 'ru' })
      .expect(200, { ok: true });
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' })
      .expect(200, { ok: true });

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe('person@example.com');
    expect(mailer.sent[0].text).toContain('http://localhost:5173/reset-password#token=');
    const token = tokenFromLastEmail();
    expect(prismaMocks.authToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'password_reset', tokenHash: hash(token) }),
    });
    // Earlier unused reset links are invalidated.
    expect(prismaMocks.authToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, type: 'password_reset', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('sets the new password, verifies the email and signs out every session', async () => {
    prismaMocks.authToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: user.id,
      type: 'password_reset',
    });

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: 'new-secret' })
      .expect(200);

    expect(prismaMocks.authToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hash('a'.repeat(64)) },
    });
    expect(prismaMocks.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { passwordHash: expect.stringMatching(/^\$2[aby]\$/) },
    });
    expect(prismaMocks.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prismaMocks.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });

  it('rejects used, expired or unknown tokens', async () => {
    prismaMocks.authToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: user.id,
      type: 'password_reset',
    });
    prismaMocks.authToken.updateMany.mockResolvedValue({ count: 0 });

    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'used-token', password: 'new-secret' })
      .expect(400);

    expect(response.body.error).toBe('This reset link is invalid or has expired');
    expect(prismaMocks.user.update).not.toHaveBeenCalled();
  });

  it('does not accept an email verification token as a reset token', async () => {
    prismaMocks.authToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: user.id,
      type: 'email_verification',
    });

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'verify-token', password: 'new-secret' })
      .expect(400);
  });

  it('is unavailable when email is disabled', async () => {
    mailer.enabled = false;
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'person@example.com' })
      .expect(503);
  });
});

describe('email verification', () => {
  it('sends a confirmation email on sign-up', async () => {
    prismaMocks.user.create.mockResolvedValue({ id: user.id, email: user.email, name: null });
    prismaMocks.user.findUnique.mockResolvedValue(user);
    prismaMocks.authSession.create.mockResolvedValue({});

    await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, password: 'secret123', locale: 'ru' })
      .expect(201);

    expect(mailer.sent[0].text).toContain('http://localhost:5173/verify-email#token=');
    expect(mailer.sent[0].text).toContain('Подтвердите email');
  });

  it('still signs the user up when the email cannot be sent', async () => {
    const { sendEmail } = await import('@server/lib/mailer.js');
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Resend is down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prismaMocks.user.create.mockResolvedValue({ id: user.id, email: user.email, name: null });
    prismaMocks.user.findUnique.mockResolvedValue(user);
    prismaMocks.authSession.create.mockResolvedValue({});

    await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, password: 'secret123' })
      .expect(201);
  });

  it('confirms the email with a valid token', async () => {
    prismaMocks.authToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: user.id,
      type: 'email_verification',
    });

    await request(app).post('/api/auth/verify-email').send({ token: 'verify-token' }).expect(200);

    expect(prismaMocks.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });

  it('lets a signed-in user resend the confirmation, but not once verified', async () => {
    prismaMocks.user.create.mockResolvedValue({ id: user.id, email: user.email, name: null });
    prismaMocks.user.findUnique.mockResolvedValue({ ...user, emailVerifiedAt: new Date() });
    prismaMocks.authSession.create.mockResolvedValue({});
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, password: 'secret123' });
    const auth = `Bearer ${register.body.accessToken}`;

    await request(app).post('/api/auth/resend-verification').set('Authorization', auth).expect(200);
    expect(mailer.sent).toHaveLength(0);

    prismaMocks.user.findUnique.mockResolvedValue(user);
    await request(app)
      .post('/api/auth/resend-verification')
      .set('Authorization', auth)
      .send({ locale: 'en' })
      .expect(200);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].text).toContain('Confirm your email');
  });
});
