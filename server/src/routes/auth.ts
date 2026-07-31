import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authController } from '@server/controllers/authController.js';
import { authMiddleware } from '@server/middleware/auth.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.use(authLimiter);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.get('/yandex', authController.yandex);
router.get('/yandex/callback', authController.yandexCallback);

export { router as authRouter };
