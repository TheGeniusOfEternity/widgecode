import type { ReactNode } from 'react';

import type { BlockVariant } from '../blockSizes.js';
import type { BlockTypography } from '../geometry.js';
import type { PaletteTokens, WidgetLocale, widgetLabels } from '../theme.js';
import type { WidgetCanvasBlock } from '../types.js';
import type { BlockFrame } from '../svgPrimitives.js';

/** Everything a block renderer needs; coordinates are relative to the block's content box. */
export type BlockRenderContext = {
  block: WidgetCanvasBlock;
  variant: BlockVariant;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
  labels: ReturnType<typeof widgetLabels>;
  t: BlockTypography;
  frame: BlockFrame;
  tokens: PaletteTokens;
  locale: WidgetLocale;
  username: string;
  avatarDataUri?: string;
};

export type BlockRenderer = (context: BlockRenderContext) => ReactNode;
