import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorMiddleware } from './middleware/error.js';
import { healthRouter } from './routes/health.js';

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
  app.use(morgan('dev'));

  app.use('/api/health', healthRouter);

  app.use(errorMiddleware);

  return app;
};
