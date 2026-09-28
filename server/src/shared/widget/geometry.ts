// Single source of truth for widget geometry. The HTML canvas (editor, public page, iframe),
// the SVG export and the stored widget size all derive their numbers from here.

export const WIDGET_WIDTH = 600;
export const MAX_WIDGET_HEIGHT = 1200;
export const MAX_GRID_COLUMNS = 2;
export const MAX_BLOCK_HEIGHT = 2;
export const GRID_GAP = 18;
export const BLOCK_PADDING = 20;
export const BLOCK_BORDER = 1;
export const CANVAS_RADIUS = 28;
export const BLOCK_RADIUS = 20;
export const BLOCK_LINE_HEIGHT = 1.25;
export const TEXT_BLOCK_LINE_HEIGHT = 1.12;

export type GridLayout = { x: number; y: number; width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const canvasPadding = (width: number) => clamp(width * 0.04, 20, 34);

export const cellSize = (width: number, columns = MAX_GRID_COLUMNS) =>
  (width - canvasPadding(width) * 2 - GRID_GAP * (columns - 1)) / columns;

export const gridRows = (layouts: GridLayout[]) =>
  Math.max(1, ...layouts.map((layout) => layout.y + layout.height));

/** Stored widget size: fixed width, square cells, height grows with rows. */
export const widgetDimensions = (layouts: GridLayout[], width = WIDGET_WIDTH) => {
  const rows = gridRows(layouts);
  const padding = canvasPadding(width);
  return {
    width,
    height: Math.min(
      MAX_WIDGET_HEIGHT,
      Math.round(rows * cellSize(width) + GRID_GAP * (rows - 1) + padding * 2),
    ),
  };
};

/** Pixel box of a block inside a canvas of the given size. */
export const blockBox = (
  layout: GridLayout,
  canvas: { width: number; height: number; columns?: number; rows: number },
) => {
  const columns = canvas.columns ?? MAX_GRID_COLUMNS;
  const padding = canvasPadding(canvas.width);
  const cellWidth = cellSize(canvas.width, columns);
  const cellHeight = Math.max(
    1,
    (canvas.height - padding * 2 - GRID_GAP * (canvas.rows - 1)) / canvas.rows,
  );
  return {
    x: padding + layout.x * (cellWidth + GRID_GAP),
    y: padding + layout.y * (cellHeight + GRID_GAP),
    width: cellWidth * layout.width + GRID_GAP * (layout.width - 1),
    height: cellHeight * layout.height + GRID_GAP * (layout.height - 1),
  };
};

/** Width available to block content (inside border and padding). */
export const blockContentWidth = (blockWidth: number) =>
  Math.max(blockWidth - (BLOCK_PADDING + BLOCK_BORDER) * 2, 80);

/**
 * Typography scale for a block, derived from its content width. Both renderers use these exact
 * pixel values: the HTML canvas via CSS custom properties, the SVG canvas directly.
 */
export const blockTypography = (contentWidth: number) => {
  const unit = contentWidth / 100;
  return {
    meta: clamp(unit * 4.5, 10, 12),
    heading: clamp(unit * 7, 14, 18),
    statValue: clamp(unit * 10, 14, 30),
    text: clamp(unit * 12, 16, 34),
    avatar: clamp(unit * 16, 24, 42),
    headingGap: clamp(unit * 3, 8, 12),
    sectionGap: clamp(unit * 6, 10, 18),
    columnGap: clamp(unit * 8, 10, 22),
    rowGap: clamp(unit * 4, 6, 9),
  };
};

export type BlockTypography = ReturnType<typeof blockTypography>;
