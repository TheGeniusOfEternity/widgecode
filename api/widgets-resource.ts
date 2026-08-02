import type { Request, Response } from 'express';

import { createApp } from '../server/dist/src/app.js';

const app = createApp();

const queryValue = (request: Request, key: string): string | undefined => {
  const value = request.query[key];
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
};

export default (request: Request, response: Response) => {
  const resource = queryValue(request, 'resource');
  const widgetId = queryValue(request, 'widgetId');
  const blockId = queryValue(request, 'blockId');
  const slug = queryValue(request, 'slug');
  const action = queryValue(request, 'action');

  const path =
    resource === 'widget' && widgetId
      ? action === 'blocks'
        ? `/api/widgets/${encodeURIComponent(widgetId)}/blocks`
        : action === 'preview'
          ? `/api/widgets/${encodeURIComponent(widgetId)}/preview`
          : `/api/widgets/${encodeURIComponent(widgetId)}`
      : resource === 'block' && blockId
        ? `/api/blocks/${encodeURIComponent(blockId)}`
        : resource === 'public' && slug
          ? `/api/public/widgets/${encodeURIComponent(slug)}`
          : null;

  if (!path) {
    response.status(404).json({ error: 'Resource route not found' });
    return;
  }

  request.url = path;
  app(request, response);
};
