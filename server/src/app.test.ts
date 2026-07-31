import request from 'supertest';

import { createApp } from '@server/app.js';

it('responds to health checks', async () => {
  await request(createApp()).get('/api/health').expect(200, { status: 'ok' });
});
