import type { ErrorRequestHandler } from 'express';

import { AppError } from '@server/lib/errors.js';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
};
