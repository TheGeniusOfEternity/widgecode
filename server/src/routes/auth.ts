import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authController } from '@server/controllers/authController.js';
import { authMiddleware } from '@server/middleware/auth.js';

const router = Router();
const limiterOptions = { standardHeaders: 'draft-8', legacyHeaders: false } as const;
// Strict: endpoints that accept credentials or start an OAuth flow.
const credentialsLimiter = rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 30 });
// Lenient: session upkeep that every open tab performs on load and every access-token expiry.
const sessionLimiter = rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 300 });

router.post('/register', credentialsLimiter, authController.register);
router.post('/login', credentialsLimiter, authController.login);
router.post('/refresh', sessionLimiter, authController.refresh);
router.post('/logout', sessionLimiter, authController.logout);
router.get('/me', sessionLimiter, authMiddleware, authController.me);
router.get('/yandex', credentialsLimiter, authController.yandex);
router.get('/yandex/callback', credentialsLimiter, authController.yandexCallback);

export { router as authRouter };
