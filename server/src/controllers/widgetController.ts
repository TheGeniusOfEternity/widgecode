import type { NextFunction, Response } from 'express';
import { z } from 'zod';

import { AppError } from '@server/lib/errors.js';
import type { AuthRequest } from '@server/middleware/auth.js';
import { widgetService } from '@server/services/widgetService.js';
import { renderWidgetStats } from '@server/services/statsService.js';
import {
  blockTypeSchema,
  blockLayoutSchema,
  sourceTypeSchema,
  presetDefinitions,
  widgetConfigSchema,
  MAX_GRID_COLUMNS,
} from '@server/widgets/registry.js';

const widgetIdSchema = z.string().trim().min(1).max(100);
const presetIdSchema = z.enum(Object.keys(presetDefinitions) as [string, ...string[]]);

const createWidgetSchema = z.object({
  title: z.string().trim().min(1, 'Widget name is required').max(80),
  source: sourceTypeSchema,
  username: z.string().trim().max(100).optional(),
  presetId: presetIdSchema.optional(),
  width: z.number().int().min(280).max(1600).optional(),
  height: z.number().int().min(160).max(1200).optional(),
});

const updateWidgetSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  width: z.number().int().min(280).max(1600).optional(),
  height: z.number().int().min(160).max(1200).optional(),
  public: z.boolean().optional(),
  config: widgetConfigSchema.partial().optional(),
});

const addBlockSchema = z.object({
  type: blockTypeSchema,
  config: z.unknown().optional(),
});

const updateBlockSchema = z.object({ config: z.unknown().optional() });

const layoutUpdateSchema = z.object({
  layouts: z.array(z.object({ blockId: widgetIdSchema, layout: blockLayoutSchema })).max(5),
  columns: z.number().int().min(1).max(MAX_GRID_COLUMNS).optional(),
});

const parse = <T>(schema: z.ZodType<T>, value: unknown) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, result.error.issues[0]?.message ?? 'Invalid request');
  }
  return result.data;
};

const userId = (req: AuthRequest) => {
  if (!req.userId) throw new AppError(401, 'Authentication required');
  return req.userId;
};

export class WidgetController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ widgets: await widgetService.list(userId(req)) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = parse(createWidgetSchema, req.body);
      const widget = await widgetService.create(userId(req), input);
      res.status(201).json({ widget });
    } catch (error) {
      next(error);
    }
  };

  get = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        widget: await widgetService.get(userId(req), parse(widgetIdSchema, req.params.id)),
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = parse(updateWidgetSchema, req.body);
      const widget = await widgetService.update(
        userId(req),
        parse(widgetIdSchema, req.params.id),
        input,
      );
      res.json({ widget });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await widgetService.remove(userId(req), parse(widgetIdSchema, req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  addBlock = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = parse(addBlockSchema, req.body);
      const block = await widgetService.addBlock(
        userId(req),
        parse(widgetIdSchema, req.params.widgetId),
        {
          type: input.type,
          config: input.config ?? {},
        },
      );
      res.status(201).json({ block });
    } catch (error) {
      next(error);
    }
  };

  updateBlock = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = parse(updateBlockSchema, req.body);
      const block = await widgetService.updateBlock(
        userId(req),
        parse(widgetIdSchema, req.params.id),
        input,
      );
      res.json({ block });
    } catch (error) {
      next(error);
    }
  };

  removeBlock = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await widgetService.removeBlock(userId(req), parse(widgetIdSchema, req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  reorderBlocks = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = parse(layoutUpdateSchema, req.body);
      const widget = await widgetService.updateLayouts(
        userId(req),
        parse(widgetIdSchema, req.params.widgetId),
        input.layouts,
        input.columns,
      );
      res.json({ widget });
    } catch (error) {
      next(error);
    }
  };

  getPublic = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const widget = await widgetService.getPublic(parse(widgetIdSchema, req.params.slug));
      if (!widget) {
        res.status(404).json({ error: 'Public widget not found' });
        return;
      }
      res.json({ widget, rendered: await renderWidgetStats(widget) });
    } catch (error) {
      next(error);
    }
  };
}

export const widgetController = new WidgetController();
