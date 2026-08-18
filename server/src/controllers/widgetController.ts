import type { NextFunction, Response } from 'express';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';

import { AppError } from '@server/lib/errors.js';
import type { AuthRequest } from '@server/middleware/auth.js';
import { widgetService } from '@server/services/widgetService.js';
import { renderWidgetStats } from '@server/services/statsService.js';
import { WidgetCanvas } from '@shared/widget/WidgetCanvas.js';
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

const imageDimension = (value: unknown) => {
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 2000) : undefined;
};

const imageOutputDimensions = (
  baseWidth: number,
  baseHeight: number,
  requestedWidth?: number,
  requestedHeight?: number,
) => {
  if (requestedWidth === undefined && requestedHeight === undefined) return undefined;
  if (requestedWidth !== undefined && requestedHeight === undefined) {
    return {
      width: requestedWidth,
      height: Math.max(1, Math.round((requestedWidth * baseHeight) / baseWidth)),
    };
  }
  if (requestedWidth === undefined && requestedHeight !== undefined) {
    return {
      width: Math.max(1, Math.round((requestedHeight * baseWidth) / baseHeight)),
      height: requestedHeight,
    };
  }

  const scale = Math.min(requestedWidth! / baseWidth, requestedHeight! / baseHeight);
  return {
    width: Math.max(1, Math.round(baseWidth * scale)),
    height: Math.max(1, Math.round(baseHeight * scale)),
  };
};

const createWidgetSchema = z.object({
  title: z.string().trim().min(1, 'Widget name is required').max(80),
  source: sourceTypeSchema.optional(),
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

const previewBlockSchema = z.object({
  id: widgetIdSchema,
  type: blockTypeSchema,
  config: z.record(z.string(), z.unknown()).default({}),
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

const AVATAR_CACHE_TTL_MS = 15 * 60 * 1000;
const AVATAR_NEGATIVE_TTL_MS = 5 * 60 * 1000;
const AVATAR_ERROR_TTL_MS = 30 * 1000;
const avatarCache = new Map<string, { expiresAt: number; dataUri: string | null }>();
const inflightAvatars = new Map<string, Promise<string | null>>();

const asHttpUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

const withAvatarSize = (url: string, size: number): string =>
  `${url}${url.includes('?') ? '&' : '?'}s=${size}`;

const storeAvatar = (url: string, dataUri: string | null, ttl: number) => {
  avatarCache.set(url, { expiresAt: Date.now() + ttl, dataUri });
};

const doFetchAvatar = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(withAvatarSize(url, 84), {
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg',
        'User-Agent': 'widgecode-widget-builder',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      storeAvatar(url, null, AVATAR_NEGATIVE_TTL_MS);
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const type = contentType.split(';')[0].trim() || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer()).toString('base64');
    const dataUri = `data:${type};base64,${buffer}`;
    storeAvatar(url, dataUri, AVATAR_CACHE_TTL_MS);
    return dataUri;
  } catch {
    storeAvatar(url, null, AVATAR_ERROR_TTL_MS);
    return null;
  }
};

const fetchAvatarDataUri = async (url: string): Promise<string | null> => {
  const now = Date.now();
  const cached = avatarCache.get(url);
  if (cached && cached.expiresAt > now) return cached.dataUri;
  if (cached) avatarCache.delete(url);

  const inflight = inflightAvatars.get(url);
  if (inflight) return inflight;

  const promise = doFetchAvatar(url).finally(() => inflightAvatars.delete(url));
  inflightAvatars.set(url, promise);
  return promise;
};

const buildAvatarDataUris = async (
  renderedBlocks: { id: string; data?: unknown }[],
): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};
  await Promise.all(
    renderedBlocks.map(async (block) => {
      const data =
        block.data && typeof block.data === 'object'
          ? (block.data as Record<string, unknown>)
          : null;
      const url = data ? asHttpUrl(data.avatarUrl) : null;
      if (!url) return;
      const dataUri = await fetchAvatarDataUri(url);
      if (dataUri) results[block.id] = dataUri;
    }),
  );
  return results;
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

  preview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = parse(previewBlockSchema, req.body);
      const widget = await widgetService.get(
        userId(req),
        parse(widgetIdSchema, req.params.widgetId),
      );
      const rendered = await renderWidgetStats({
        config: widget.config,
        blocks: [{ id: input.id, type: input.type, position: 0, config: input.config }],
      });
      res.json({ block: rendered.blocks[0] });
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

  getPublicImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const widget = await widgetService.getPublic(parse(widgetIdSchema, req.params.slug));
      if (!widget) {
        res.status(404).json({ error: 'Public widget not found' });
        return;
      }

      const locale = req.query.locale === 'ru' ? 'ru' : 'en';
      const rendered = await renderWidgetStats(widget);
      const avatarDataUris = await buildAvatarDataUris(rendered.blocks);
      const outputDimensions = imageOutputDimensions(
        widget.width,
        widget.height,
        imageDimension(req.query.width),
        imageDimension(req.query.height),
      );
      const config =
        widget.config && typeof widget.config === 'object'
          ? (widget.config as Record<string, unknown>)
          : {};
      const svg = renderToStaticMarkup(
        createElement(WidgetCanvas, {
          title: widget.title,
          blocks: widget.blocks.map((block) => ({
            id: block.id,
            type: block.type,
            position: block.position,
            config: block.config,
          })),
          palette: typeof config.palette === 'string' ? config.palette : 'lavender',
          paletteMode: typeof config.paletteMode === 'string' ? config.paletteMode : 'auto',
          columns:
            config.grid && typeof config.grid === 'object'
              ? Number((config.grid as Record<string, unknown>).columns) || 1
              : 1,
          width: widget.width,
          height: widget.height,
          outputWidth: outputDimensions?.width,
          outputHeight: outputDimensions?.height,
          renderedBlocks: rendered.blocks,
          avatarDataUris,
          locale,
          showChrome: false,
        }),
      );
      res
        .status(200)
        .set({
          'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=60',
          'Content-Type': 'image/svg+xml; charset=utf-8',
        })
        .send(svg);
    } catch (error) {
      next(error);
    }
  };
}

export const widgetController = new WidgetController();
