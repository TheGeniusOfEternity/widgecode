import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorMiddleware } from '@server/middleware/error.js';
import { authRouter } from '@server/routes/auth.js';
import { healthRouter } from '@server/routes/health.js';
import { blocksRouter, publicWidgetsRouter, widgetsRouter } from '@server/routes/widgets.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/widgets', widgetsRouter);
  app.use('/api/blocks', blocksRouter);
  app.use('/api/public/widgets', publicWidgetsRouter);

  app.use(errorMiddleware);

  return app;
};
