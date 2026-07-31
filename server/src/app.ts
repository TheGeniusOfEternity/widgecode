import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorMiddleware } from '@server/middleware/error.js';
import { authRouter } from '@server/routes/auth.js';
import { healthRouter } from '@server/routes/health.js';

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

  app.use(errorMiddleware);

  return app;
};
