import request from 'supertest';

import { createApp } from '@server/app.js';

afterEach(() => {
  delete process.env.VERCEL;
});

const login = (app: ReturnType<typeof createApp>, ip: string) =>
  request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({});

it('rate limits credential endpoints per client IP behind the Vercel proxy', async () => {
  process.env.VERCEL = '1';
  const app = createApp();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await login(app, '203.0.113.1').expect(400);
  }
  await login(app, '203.0.113.1').expect(429);
  await login(app, '203.0.113.2').expect(400);
});

it('does not count session refreshes against the credentials limit', async () => {
  process.env.VERCEL = '1';
  const app = createApp();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await request(app).post('/api/auth/refresh').set('X-Forwarded-For', '203.0.113.3').expect(401);
  }
  await login(app, '203.0.113.3').expect(400);
});
