import type { CSSProperties } from 'react';

import type { BlockLayout, PaletteId, WidgetBlock } from '@/entities/widget/model';
import { paletteTokens } from '@/entities/widget/model';
import {
  BLOCK_BORDER,
  BLOCK_LINE_HEIGHT,
  BLOCK_PADDING,
  BLOCK_RADIUS,
  CANVAS_RADIUS,
  GRID_GAP,
  MAX_GRID_COLUMNS,
  TEXT_BLOCK_LINE_HEIGHT,
  WIDGET_WIDTH,
  blockBox,
  blockContentWidth,
  blockTypography,
  canvasPadding,
} from '@shared/widget/geometry';
import { WIDGET_FONT_FAMILY } from '@shared/widget/WidgetCanvas';
import { difficultyColors, errorColor } from '@shared/widget/theme';

export const getBlockLayout = (block: WidgetBlock): BlockLayout => {
  const value = block.config.layout;
  if (!value || typeof value !== 'object') return { x: 0, y: 0, width: 1, height: 1 };
  const layout = value as Partial<BlockLayout>;
  return {
    x: typeof layout.x === 'number' ? layout.x : 0,
    y: typeof layout.y === 'number' ? layout.y : 0,
    width: typeof layout.width === 'number' ? layout.width : 1,
    height: typeof layout.height === 'number' ? layout.height : 1,
  };
};

/** CSS custom properties shared by every widget canvas surface (colors + geometry). */
export const canvasStyleVars = (
  palette: PaletteId,
  { width = WIDGET_WIDTH, height }: { width?: number; height?: number } = {},
) => {
  const tokens = paletteTokens[palette] ?? paletteTokens.lavender;
  return {
    '--widget-light-accent': tokens.light.accent,
    '--widget-light-soft': tokens.light.soft,
    '--widget-light-ink': tokens.light.ink,
    '--widget-light-surface': tokens.light.surface,
    '--widget-dark-accent': tokens.dark.accent,
    '--widget-dark-soft': tokens.dark.soft,
    '--widget-dark-ink': tokens.dark.ink,
    '--widget-dark-surface': tokens.dark.surface,
    '--widget-width': `${width}px`,
    '--widget-height': height ? `${height}px` : undefined,
    '--widget-padding': `${canvasPadding(width)}px`,
    '--widget-gap': `${GRID_GAP}px`,
    '--widget-radius': `${CANVAS_RADIUS}px`,
    '--widget-font': WIDGET_FONT_FAMILY,
    '--block-padding': `${BLOCK_PADDING}px`,
    '--block-border': `${BLOCK_BORDER}px`,
    '--block-radius': `${BLOCK_RADIUS}px`,
    '--block-line-height': BLOCK_LINE_HEIGHT,
    '--text-line-height': TEXT_BLOCK_LINE_HEIGHT,
    '--color-easy': difficultyColors.easy,
    '--color-medium': difficultyColors.medium,
    '--color-hard': difficultyColors.hard,
    '--color-error': errorColor,
  } as CSSProperties;
};

/** Content width and typography of a block; depends only on its column span. */
export const blockMetrics = (
  layout: BlockLayout,
  widgetWidth = WIDGET_WIDTH,
  columns = MAX_GRID_COLUMNS,
) => {
  const box = blockBox(layout, { width: widgetWidth, height: 0, columns, rows: 1 });
  const contentWidth = blockContentWidth(box.width);
  return { contentWidth, typography: blockTypography(contentWidth) };
};

/** Grid placement and typography for one block, computed like the SVG export does. */
export const blockStyleVars = (
  layout: BlockLayout,
  widgetWidth = WIDGET_WIDTH,
  columns = MAX_GRID_COLUMNS,
) => {
  const { typography: t } = blockMetrics(layout, widgetWidth, columns);
  return {
    gridColumn: `${layout.x + 1} / span ${layout.width}`,
    gridRow: `${layout.y + 1} / span ${layout.height}`,
    '--block-meta': `${t.meta}px`,
    '--block-heading': `${t.heading}px`,
    '--block-stat': `${t.statValue}px`,
    '--block-text': `${t.text}px`,
    '--block-avatar': `${t.avatar}px`,
    '--block-heading-gap': `${t.headingGap}px`,
    '--block-section-gap': `${t.sectionGap}px`,
    '--block-column-gap': `${t.columnGap}px`,
    '--block-row-gap': `${t.rowGap}px`,
  } as CSSProperties;
};
