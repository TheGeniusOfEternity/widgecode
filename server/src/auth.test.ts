import request from 'supertest';

import { createApp } from '@server/app.js';

const prismaMocks = vi.hoisted(() => ({
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  authSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('@server/lib/prisma.js', () => ({ prisma: prismaMocks }));
// Email flows are covered in emailFlows.test.ts; keep sign-up here free of mail side effects.
vi.mock('@server/lib/mailer.js', () => ({ isEmailEnabled: () => false, sendEmail: vi.fn() }));

const app = createApp();
const user = { id: 'user-1', email: 'person@example.com', name: 'Person' };

beforeEach(() => {
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.AUTH_REFRESH_DAYS = '30';
  vi.clearAllMocks();
});

it('rejects requests with an invalid access token', async () => {
  await request(app)
    .get('/api/auth/me')
    .set('Authorization', 'Bearer invalid-token')
    .expect(401, { error: 'Invalid or expired access token' });

  expect(prismaMocks.user.findUnique).not.toHaveBeenCalled();
});

it('registers a user and sets an httpOnly refresh cookie', async () => {
  prismaMocks.user.create.mockResolvedValue(user);
  prismaMocks.authSession.create.mockResolvedValue({});

  const response = await request(app)
    .post('/api/auth/register')
    .send({ email: ' Person@Example.com ', password: 'secret123', name: 'Person' })
    .expect(201);

  expect(response.body.user).toEqual(user);
  expect(response.body.accessToken).toEqual(expect.any(String));
  expect(response.headers['set-cookie'][0]).toContain('widgecode_refresh=');
  expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(prismaMocks.user.create).toHaveBeenCalledWith({
    data: {
      email: 'person@example.com',
      passwordHash: expect.any(String),
      name: 'Person',
    },
    select: { id: true, email: true, name: true },
  });
});

it('protects the current user endpoint with a valid access token', async () => {
  prismaMocks.user.create.mockResolvedValue(user);
  prismaMocks.user.findUnique.mockResolvedValue({ ...user, passwordHash: 'hash', yandexId: null });
  prismaMocks.authSession.create.mockResolvedValue({});
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({ email: user.email, password: 'secret123' });

  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
    .expect(200, { user, methods: { password: true, yandex: false }, emailVerified: false });
});

it('rotates a refresh session and revokes it on logout', async () => {
  prismaMocks.user.create.mockResolvedValue(user);
  prismaMocks.authSession.create.mockResolvedValue({});
  prismaMocks.authSession.updateMany.mockResolvedValue({ count: 1 });

  const agent = request.agent(app);
  const registerResponse = await agent
    .post('/api/auth/register')
    .send({ email: user.email, password: 'secret123' })
    .expect(201);

  // The mocked database hash must match the cookie for rotation to succeed.
  const refreshCookie = registerResponse.headers['set-cookie'][0].split(';')[0].split('=')[1];
  const { createHash } = await import('node:crypto');
  const sessionId = prismaMocks.authSession.create.mock.calls[0][0].data.id;
  prismaMocks.authSession.findUnique.mockResolvedValue({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: createHash('sha256').update(refreshCookie).digest('hex'),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user,
  });

  await agent.post('/api/auth/refresh').expect(200);
  await agent.post('/api/auth/logout').expect(200, { ok: true });
  expect(prismaMocks.authSession.updateMany).toHaveBeenCalled();
});

describe('Yandex OAuth callback', () => {
  const yandexProfile = { id: 'ya-1', default_email: 'Person@Example.com', display_name: 'Person' };

  beforeEach(() => {
    process.env.YANDEX_CLIENT_ID = 'client';
    process.env.YANDEX_CLIENT_SECRET = 'secret';
    process.env.YANDEX_REDIRECT_URI = 'http://localhost:4000/api/auth/yandex/callback';
    process.env.CLIENT_URL = 'http://localhost:5173';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'ya-token' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => yandexProfile }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const callback = () =>
    request(app)
      .get('/api/auth/yandex/callback?state=state-1&code=code-1')
      .set('Cookie', 'widgecode_oauth_state=state-1');

  it('does not link a Yandex identity to an existing email account', async () => {
    prismaMocks.user.findUnique.mockImplementation(({ where }: { where: Record<string, string> }) =>
      Promise.resolve(
        where.email === 'person@example.com'
          ? { ...user, passwordHash: 'hash', yandexId: null }
          : null,
      ),
    );

    const response = await callback().expect(302);

    expect(response.headers.location).toBe(
      'http://localhost:5173/auth?oauth_error=oauth_account_conflict',
    );
    expect(prismaMocks.user.create).not.toHaveBeenCalled();
    expect(prismaMocks.authSession.create).not.toHaveBeenCalled();
  });

  it('creates a new account for an unknown Yandex identity', async () => {
    prismaMocks.user.findUnique.mockResolvedValue(null);
    prismaMocks.user.create.mockResolvedValue({ ...user, yandexId: 'ya-1' });
    prismaMocks.authSession.create.mockResolvedValue({});

    const response = await callback().expect(302);

    expect(response.headers.location).toMatch(
      /^http:\/\/localhost:5173\/auth\/callback#access_token=/,
    );
    expect(prismaMocks.user.create).toHaveBeenCalledWith({
      data: {
        yandexId: 'ya-1',
        email: 'person@example.com',
        name: 'Person',
        emailVerifiedAt: expect.any(Date),
      },
    });
  });
});

describe('Yandex account linking', () => {
  const linkedUser = { ...user, passwordHash: 'hash', yandexId: null };

  beforeEach(() => {
    process.env.YANDEX_CLIENT_ID = 'client';
    process.env.YANDEX_CLIENT_SECRET = 'secret';
    process.env.YANDEX_REDIRECT_URI = 'http://localhost:4000/api/auth/yandex/callback';
    process.env.CLIENT_URL = 'http://localhost:5173';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'ya-token' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'ya-1' }) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Registers to get a real refresh cookie, then runs the link callback with it.
  const linkCallback = async () => {
    prismaMocks.user.create.mockResolvedValue(user);
    prismaMocks.authSession.create.mockResolvedValue({});
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, password: 'secret123' });
    const refreshCookie = register.headers['set-cookie'][0].split(';')[0];
    const refreshToken = refreshCookie.split('=')[1];
    const { createHash } = await import('node:crypto');
    const sessionId = prismaMocks.authSession.create.mock.calls[0][0].data.id;
    prismaMocks.authSession.findUnique.mockResolvedValue({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: linkedUser,
    });
    return request(app)
      .get('/api/auth/yandex/callback?state=state-1&code=code-1')
      .set('Cookie', [refreshCookie, 'widgecode_oauth_state=link:state-1'].join('; '));
  };

  it('starts linking with the intent bound to the OAuth state', async () => {
    const response = await request(app).get('/api/auth/yandex?intent=link').expect(302);

    expect(response.headers.location).toMatch(/^https:\/\/oauth\.yandex\.ru\/authorize\?/);
    const state = new URL(response.headers.location).searchParams.get('state');
    expect(response.headers['set-cookie'][0]).toContain(`widgecode_oauth_state=link%3A${state}`);
  });

  it('sends the user back to the app when Yandex is not configured', async () => {
    delete process.env.YANDEX_CLIENT_SECRET;

    await request(app)
      .get('/api/auth/yandex')
      .expect(302)
      .expect('Location', 'http://localhost:5173/auth?oauth_error=oauth_not_configured');
    await request(app)
      .get('/api/auth/yandex?intent=link')
      .expect(302)
      .expect('Location', 'http://localhost:5173/account?link_error=yandex_failed');
  });

  it('links a free Yandex identity to the signed-in account', async () => {
    prismaMocks.user.findUnique.mockResolvedValue(null);

    const response = await linkCallback();

    expect(response.headers.location).toBe('http://localhost:5173/account?linked=yandex');
    expect(prismaMocks.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { yandexId: 'ya-1' },
    });
  });

  it('refuses a Yandex identity that belongs to another account', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({
      ...user,
      id: 'someone-else',
      yandexId: 'ya-1',
    });

    const response = await linkCallback();

    expect(response.headers.location).toBe('http://localhost:5173/account?link_error=yandex_taken');
    expect(prismaMocks.user.update).not.toHaveBeenCalled();
  });

  it('requires a signed-in session to link', async () => {
    const response = await request(app)
      .get('/api/auth/yandex/callback?state=state-1&code=code-1')
      .set('Cookie', 'widgecode_oauth_state=link:state-1');

    expect(response.headers.location).toBe(
      'http://localhost:5173/account?link_error=session_expired',
    );
  });

  it('only unlinks Yandex when a password remains', async () => {
    prismaMocks.user.create.mockResolvedValue(user);
    prismaMocks.authSession.create.mockResolvedValue({});
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, password: 'secret123' });
    const auth = `Bearer ${register.body.accessToken}`;

    prismaMocks.user.findUnique.mockResolvedValue({
      ...user,
      passwordHash: null,
      yandexId: 'ya-1',
    });
    await request(app).delete('/api/auth/yandex').set('Authorization', auth).expect(409);

    prismaMocks.user.findUnique.mockResolvedValue({
      ...user,
      passwordHash: 'hash',
      yandexId: 'ya-1',
    });
    await request(app)
      .delete('/api/auth/yandex')
      .set('Authorization', auth)
      .expect(200, { methods: { password: true, yandex: false } });
  });
});
