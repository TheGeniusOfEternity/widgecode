import request from 'supertest';

import { createApp } from './app.js';

const prismaMocks = vi.hoisted(() => ({
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  authSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('./lib/prisma.js', () => ({ prisma: prismaMocks }));

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
  expect(response.headers['set-cookie'][0]).toContain('github_stats_refresh=');
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
  prismaMocks.user.findUnique.mockResolvedValue(user);
  prismaMocks.authSession.create.mockResolvedValue({});
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({ email: user.email, password: 'secret123' });

  await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
    .expect(200, { user });
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
