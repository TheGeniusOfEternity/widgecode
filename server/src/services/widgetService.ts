import { randomBytes } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { prisma } from '@server/lib/prisma.js';
import { AppError } from '@server/lib/errors.js';
import {
  getDefaultBlockConfig,
  getSourceForBlock,
  blockLayoutSchema,
  MAX_GRID_COLUMNS,
  MAX_WIDGET_BLOCKS,
  parseBlockConfig,
  presetDefinitions,
  widgetConfigSchema,
  type BlockLayout,
  type BlockType,
  type WidgetConfig,
} from '@server/widgets/registry.js';

const widgetInclude = { blocks: { orderBy: { position: 'asc' as const } } };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[а-яё]/gi, (character) => character);

const createSlug = async (source: string, blocks: { type: string }[]) => {
  const prefix = source === 'leetcode' ? 'leetcode-stats' : 'gh-stats';
  const name =
    blocks
      .map((block) => slugify(block.type))
      .filter(Boolean)
      .join('-') || 'custom';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = `${prefix}-${name}-${randomBytes(3).toString('hex')}`;
    const exists = await prisma.widget.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
  }

  throw new AppError(500, 'Could not generate a unique widget URL');
};

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

const ensureWidget = async (userId: string, widgetId: string) => {
  const widget = await prisma.widget.findFirst({
    where: { id: widgetId, userId },
    include: widgetInclude,
  });
  if (!widget) throw new AppError(404, 'Widget not found');
  return widget;
};

const normalizeConfig = (config: unknown, fallback?: Partial<WidgetConfig>) => {
  const incoming = config && typeof config === 'object' ? (config as Record<string, unknown>) : {};
  const incomingSources =
    incoming.sources && typeof incoming.sources === 'object'
      ? (incoming.sources as Record<string, unknown>)
      : {};
  const parsed = {
    ...fallback,
    ...incoming,
    sources: { ...(fallback?.sources ?? {}), ...incomingSources },
  };
  const result = widgetConfigSchema.safeParse(parsed);
  if (!result.success)
    throw new AppError(400, result.error.issues[0]?.message ?? 'Invalid widget config');
  return result.data;
};

const layoutFromBlock = (block: { position: number; config: unknown }): BlockLayout => {
  const value =
    block.config && typeof block.config === 'object'
      ? (block.config as Record<string, unknown>)
      : {};
  const layout = value.layout;
  const result = blockLayoutSchema.safeParse(layout);
  return result.success ? result.data : { x: 0, y: block.position, width: 1, height: 1 };
};

const normalizeBlockConfig = (type: BlockType, config: unknown, layout?: BlockLayout) => {
  const input = config && typeof config === 'object' ? (config as Record<string, unknown>) : {};
  const defaults =
    Object.keys(input).length > 0
      ? input
      : (getDefaultBlockConfig(type) as Record<string, unknown>);
  const result = parseBlockConfig(type, {
    ...defaults,
    layout: layout ?? input.layout ?? { x: 0, y: 0, width: 1, height: 1 },
  });
  if (!result.success)
    throw new AppError(400, result.error.issues[0]?.message ?? 'Invalid block config');
  return result.data;
};

const validateLayouts = (
  blocks: { id: string; position: number; type: string; config: unknown }[],
  config: WidgetConfig,
) => {
  if (blocks.length > MAX_WIDGET_BLOCKS) {
    throw new AppError(400, `A widget can contain at most ${MAX_WIDGET_BLOCKS} blocks`);
  }

  const columns = config.grid.columns;
  const layouts = blocks.map((block) => ({ block, layout: layoutFromBlock(block) }));
  for (const { layout } of layouts) {
    if (layout.x + layout.width > columns) {
      throw new AppError(400, 'Block layout exceeds the widget grid');
    }
  }

  for (let index = 0; index < layouts.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < layouts.length; otherIndex += 1) {
      const left = layouts[index].layout;
      const right = layouts[otherIndex].layout;
      const overlaps =
        left.x < right.x + right.width &&
        left.x + left.width > right.x &&
        left.y < right.y + right.height &&
        left.y + left.height > right.y;
      if (overlaps) throw new AppError(400, 'Block layouts cannot overlap');
    }
  }
};

const validatePublicSources = (
  blocks: { type: string; config: unknown }[],
  widgetConfig: WidgetConfig,
) => {
  for (const block of blocks) {
    const source = getSourceForBlock(block.type as BlockType);
    if (!source) continue;
    const config =
      block.config && typeof block.config === 'object'
        ? (block.config as Record<string, unknown>)
        : {};
    const legacyUsername = widgetConfig.sources?.[source]?.username;
    if ((typeof config.username !== 'string' || !config.username.trim()) && !legacyUsername) {
      throw new AppError(400, 'Every data block needs a username before publishing');
    }
  }
};

export class WidgetService {
  list = (userId: string) =>
    prisma.widget.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: widgetInclude,
    });

  get = (userId: string, widgetId: string) => ensureWidget(userId, widgetId);

  create = async (
    userId: string,
    input: {
      title: string;
      source: 'github' | 'leetcode';
      username?: string;
      presetId?: string;
      width?: number;
      height?: number;
    },
  ) => {
    const preset = input.presetId
      ? presetDefinitions[input.presetId as keyof typeof presetDefinitions]
      : undefined;
    const blocks = preset?.blocks ?? [
      { type: input.source === 'leetcode' ? 'leetcode-stats' : 'github-stats', config: {} },
    ];
    if (blocks.length > MAX_WIDGET_BLOCKS) {
      throw new AppError(400, `A widget can contain at most ${MAX_WIDGET_BLOCKS} blocks`);
    }
    const username = input.username?.trim();
    const config = normalizeConfig({
      ...(username ? { sources: { [input.source]: { username } } } : {}),
      palette: 'lavender',
      grid: { columns: MAX_GRID_COLUMNS },
      renderFormat: 'iframe',
      presetId: input.presetId,
    });
    const slug = await createSlug(input.source, blocks);

    return prisma.widget.create({
      data: {
        userId,
        title: input.title.trim(),
        slug,
        width: input.width ?? 600,
        height: input.height ?? 400,
        config: toJson(config),
        blocks: {
          create: blocks.map((block, position) => ({
            type: block.type,
            position,
            config: toJson(
              normalizeBlockConfig(
                block.type,
                {
                  ...block.config,
                  ...(getSourceForBlock(block.type) === input.source && username
                    ? { username }
                    : {}),
                },
                { x: 0, y: position, width: 1, height: 1 },
              ),
            ),
          })),
        },
      },
      include: widgetInclude,
    });
  };

  update = async (
    userId: string,
    widgetId: string,
    input: {
      title?: string;
      width?: number;
      height?: number;
      public?: boolean;
      config?: unknown;
    },
  ) => {
    const existing = await ensureWidget(userId, widgetId);
    const data: Prisma.WidgetUpdateInput = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.width !== undefined) data.width = input.width;
    if (input.height !== undefined) data.height = input.height;
    if (input.public !== undefined) data.public = input.public;
    const nextConfig = normalizeConfig(
      input.config ?? existing.config,
      existing.config as Partial<WidgetConfig>,
    );
    validateLayouts(existing.blocks, nextConfig);
    if (input.public) validatePublicSources(existing.blocks, nextConfig);
    if (input.config !== undefined) data.config = toJson(nextConfig);

    return prisma.widget.update({ where: { id: widgetId }, data, include: widgetInclude });
  };

  remove = async (userId: string, widgetId: string) => {
    await ensureWidget(userId, widgetId);
    await prisma.widget.delete({ where: { id: widgetId } });
  };

  addBlock = async (
    userId: string,
    widgetId: string,
    input: { type: BlockType; config: unknown },
  ) => {
    const widget = await ensureWidget(userId, widgetId);
    if (widget.blocks.length >= MAX_WIDGET_BLOCKS) {
      throw new AppError(400, `A widget can contain at most ${MAX_WIDGET_BLOCKS} blocks`);
    }
    const position = widget.blocks.reduce((max, block) => Math.max(max, block.position), -1) + 1;
    const lastRow = widget.blocks.reduce(
      (max, block) => Math.max(max, layoutFromBlock(block).y + layoutFromBlock(block).height),
      0,
    );
    const normalizedConfig = normalizeBlockConfig(input.type, input.config, {
      x: 0,
      y: lastRow,
      width: 1,
      height: 1,
    });
    return prisma.block.create({
      data: { widgetId, type: input.type, position, config: toJson(normalizedConfig) },
    });
  };

  updateBlock = async (userId: string, blockId: string, input: { config?: unknown }) => {
    const block = await prisma.block.findFirst({
      where: { id: blockId },
      include: { widget: { include: { blocks: true } } },
    });
    if (!block || block.widget.userId !== userId) throw new AppError(404, 'Block not found');
    const config = normalizeBlockConfig(
      block.type as BlockType,
      input.config ?? block.config,
      layoutFromBlock(block),
    );
    const nextBlocks = block.widget.blocks.map((item) =>
      item.id === blockId ? { ...item, config } : item,
    );
    const widgetConfig = normalizeConfig(
      block.widget.config,
      block.widget.config as Partial<WidgetConfig>,
    );
    validateLayouts(nextBlocks, widgetConfig);
    return prisma.block.update({ where: { id: blockId }, data: { config: toJson(config) } });
  };

  removeBlock = async (userId: string, blockId: string) => {
    const block = await prisma.block.findFirst({
      where: { id: blockId },
      include: { widget: true },
    });
    if (!block || block.widget.userId !== userId) throw new AppError(404, 'Block not found');
    await prisma.block.delete({ where: { id: blockId } });
  };

  updateLayouts = async (
    userId: string,
    widgetId: string,
    layouts: { blockId: string; layout: BlockLayout }[],
    columns?: number,
  ) => {
    const widget = await ensureWidget(userId, widgetId);
    const currentIds = widget.blocks.map((block) => block.id);
    const nextIds = layouts.map((item) => item.blockId);
    if (currentIds.length !== nextIds.length || currentIds.some((id) => !nextIds.includes(id))) {
      throw new AppError(400, 'Block layout does not match this widget');
    }
    const currentConfig =
      widget.config && typeof widget.config === 'object'
        ? (widget.config as Record<string, unknown>)
        : {};
    const config = normalizeConfig(
      columns ? { ...currentConfig, grid: { columns } } : currentConfig,
      widget.config as Partial<WidgetConfig>,
    );
    const nextBlocks = widget.blocks.map((block) => {
      const nextLayout = layouts.find((item) => item.blockId === block.id)?.layout;
      return {
        ...block,
        config: normalizeBlockConfig(block.type as BlockType, block.config, nextLayout),
      };
    });
    validateLayouts(nextBlocks, config);
    await prisma.$transaction([
      ...nextBlocks.map((block) =>
        prisma.block.update({ where: { id: block.id }, data: { config: toJson(block.config) } }),
      ),
      ...(columns
        ? [prisma.widget.update({ where: { id: widgetId }, data: { config: toJson(config) } })]
        : []),
    ]);
    return ensureWidget(userId, widgetId);
  };

  getPublic = (slug: string) =>
    prisma.widget.findFirst({ where: { slug, public: true }, include: widgetInclude });
}

export const widgetService = new WidgetService();
