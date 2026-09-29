import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { widgetController } from '@server/controllers/widgetController.js';
import { authMiddleware } from '@server/middleware/auth.js';

const router = Router();

router.use(authMiddleware);
router.get('/', widgetController.list);
router.post('/', widgetController.create);
router.get('/:id', widgetController.get);
router.put('/:id', widgetController.update);
router.delete('/:id', widgetController.remove);
router.post('/:widgetId/blocks', widgetController.addBlock);
router.put('/:widgetId/blocks', widgetController.reorderBlocks);
router.post('/:widgetId/preview', widgetController.preview);

export { router as widgetsRouter };

const blocksRouter = Router();
blocksRouter.use(authMiddleware);
blocksRouter.put('/:id', widgetController.updateBlock);
blocksRouter.delete('/:id', widgetController.removeBlock);

export { blocksRouter };

const publicWidgetsRouter = Router();
const publicWidgetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

// README images are fetched through GitHub's camo proxy, so many viewers share a few IPs.
// Responses are CDN-cached; this limit only guards against cache-busting floods.
const publicImageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

publicWidgetsRouter.get('/:slug/image.svg', publicImageLimiter, widgetController.getPublicImage);
publicWidgetsRouter.get('/:slug', publicWidgetLimiter, widgetController.getPublic);

export { publicWidgetsRouter };
