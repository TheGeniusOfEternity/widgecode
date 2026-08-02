import type { Request, Response } from 'express';

import { createApp } from '../../server/dist/src/app.js';

const app = createApp();

export default (request: Request, response: Response) => {
  const widgetId = String(request.query.widgetId ?? '');
  const action = request.query.action === 'preview' ? 'preview' : 'blocks';
  request.url = `/api/widgets/${encodeURIComponent(widgetId)}/${action}`;
  app(request, response);
};
