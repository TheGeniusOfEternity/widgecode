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
router.put('/:widgetId/blocks/reorder', widgetController.reorderBlocks);
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

publicWidgetsRouter.use(publicWidgetLimiter);
publicWidgetsRouter.get('/:slug', widgetController.getPublic);

export { publicWidgetsRouter };
