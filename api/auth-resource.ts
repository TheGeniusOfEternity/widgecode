import type { Request, Response } from 'express';

import { createApp } from '../server/dist/src/app.js';

const app = createApp();

// One Vercel function for the smaller auth endpoints (the Hobby plan caps the function count).
// vercel.json rewrites /api/auth/<route> here as ?route=<route>.
const ROUTES = new Set([
  'features',
  'forgot-password',
  'reset-password',
  'verify-email',
  'resend-verification',
]);

export default (request: Request, response: Response) => {
  const route = typeof request.query.route === 'string' ? request.query.route : '';
  if (!ROUTES.has(route)) {
    response.status(404).json({ error: 'Auth route not found' });
    return;
  }
  request.url = `/api/auth/${route}`;
  app(request, response);
};
