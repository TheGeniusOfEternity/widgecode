import { DEFAULT_BLOCK_SIZE } from '@shared/widget/blockSizes';
import {
  MAX_BLOCK_HEIGHT,
  MAX_GRID_COLUMNS,
  MAX_GRID_ROWS,
  findFreeSpot,
  gridRows,
  layoutsOverlap,
  widgetDimensions,
} from '@shared/widget/geometry';
import type {
  BlockLayout,
  BlockType,
  PaletteMode,
  SourceType,
  Widget,
  WidgetBlock,
} from '@/entities/widget/model';

// Free plan limit (see docs/design/grid-and-blocks.md for planned tiers); mirrors the server.
export const MAX_BLOCKS = 8;
export const MAX_COLUMNS = MAX_GRID_COLUMNS;
export const MAX_ROWS = MAX_GRID_ROWS;
const MAX_ROW = 100;
const DEFAULT_LAYOUT: BlockLayout = { x: 0, y: 0, ...DEFAULT_BLOCK_SIZE };

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const sourceForBlock = (type: BlockType): SourceType | null => {
  if (type.startsWith('github')) return 'github';
  if (type.startsWith('leetcode')) return 'leetcode';
  return null;
};

/** Layout stored on a block, trusted as-is (blocks are normalized when the widget loads). */
export const getLayout = (block: WidgetBlock): BlockLayout => {
  const value = block.config.layout;
  return value && typeof value === 'object' ? (value as BlockLayout) : DEFAULT_LAYOUT;
};

/** Layout read from possibly legacy block config, clamped into the grid. */
const layoutFromBlock = (block: WidgetBlock, index: number): BlockLayout => {
  const input = block.config.layout;
  // Blocks saved before layouts existed are stacked by their order.
  const value: Partial<BlockLayout> =
    input && typeof input === 'object' ? (input as Partial<BlockLayout>) : { y: index };
  const x = clamp(typeof value.x === 'number' ? value.x : 0, 0, MAX_COLUMNS - 1);
  const width = clamp(
    typeof value.width === 'number' ? value.width : DEFAULT_LAYOUT.width,
    1,
    MAX_COLUMNS - x,
  );
  return {
    x,
    y: clamp(typeof value.y === 'number' ? value.y : index, 0, MAX_ROW),
    width,
    height: clamp(
      typeof value.height === 'number' ? value.height : DEFAULT_LAYOUT.height,
      1,
      MAX_BLOCK_HEIGHT,
    ),
  };
};

export const getWidgetDimensions = (blocks: WidgetBlock[]) =>
  widgetDimensions(blocks.map(layoutFromBlock));

export const layoutsFor = (widget: Widget) =>
  widget.blocks.map((block) => ({ blockId: block.id, layout: getLayout(block) }));

// Highest row where the layout fits without overlapping `obstacles`.
const firstFreeRow = (layout: BlockLayout, obstacles: BlockLayout[]) => {
  for (let y = 0; y <= MAX_ROW; y += 1) {
    const candidate = { ...layout, y };
    if (!obstacles.some((item) => layoutsOverlap(item, candidate))) return y;
  }
  return layout.y;
};

/**
 * Puts a block at `layout` (clamped into the grid) and repacks the rest with vertical
 * compaction: other blocks, top to bottom, take the highest free row around the edited block,
 * then the edited block rises into any space left above it. Resizing never throws a block to
 * another column, dropping onto an occupied cell swaps places, and shrinking closes the gap.
 */
export const placeBlock = (widget: Widget, blockId: string, layout: BlockLayout): Widget => {
  const width = clamp(layout.width, 1, MAX_COLUMNS);
  const target = {
    x: clamp(layout.x, 0, MAX_COLUMNS - width),
    y: clamp(layout.y, 0, MAX_ROW),
    width,
    height: clamp(layout.height, 1, MAX_BLOCK_HEIGHT),
  };
  const others = widget.blocks
    .filter((block) => block.id !== blockId)
    .map((block) => ({ id: block.id, layout: { ...getLayout(block) } }))
    .sort((left, right) => left.layout.y - right.layout.y || left.layout.x - right.layout.x);

  const placed = new Map<string, BlockLayout>();
  for (const other of others) {
    other.layout.y = firstFreeRow(other.layout, [target, ...placed.values()]);
    placed.set(other.id, other.layout);
  }
  target.y = firstFreeRow(target, [...placed.values()]);
  placed.set(blockId, target);

  return {
    ...widget,
    config: { ...widget.config, grid: { columns: MAX_COLUMNS } },
    blocks: widget.blocks.map((block) => {
      const next = placed.get(block.id)!;
      const current = getLayout(block);
      const unchanged =
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height;
      return unchanged ? block : { ...block, config: { ...block.config, layout: next } };
    }),
  };
};

/**
 * Drops a block with its top-left at `cell`. Dropping exactly onto a block of the same size
 * swaps the two; anything else goes through `placeBlock`.
 */
export const moveBlock = (widget: Widget, blockId: string, cell: { x: number; y: number }) => {
  const moving = widget.blocks.find((block) => block.id === blockId);
  if (!moving) return widget;
  const from = getLayout(moving);
  const to = { ...from, ...cell };
  const occupant = widget.blocks.find((block) => {
    const layout = getLayout(block);
    return (
      block.id !== blockId &&
      layout.x === to.x &&
      layout.y === to.y &&
      layout.width === from.width &&
      layout.height === from.height
    );
  });
  if (!occupant) return placeBlock(widget, blockId, to);
  return {
    ...widget,
    config: { ...widget.config, grid: { columns: MAX_COLUMNS } },
    blocks: widget.blocks.map((block) =>
      block.id === blockId
        ? { ...block, config: { ...block.config, layout: to } }
        : block.id === occupant.id
          ? { ...block, config: { ...block.config, layout: from } }
          : block,
    ),
  };
};

/**
 * Rows shown while dragging: occupied rows plus one spare drop row, unless that would go past the
 * row limit (widgets migrated from the old grid can already be taller).
 */
export const dragGridRows = (widget: Widget) => {
  const rows = occupiedRows(widget);
  return Math.max(2, rows < MAX_ROWS ? rows + 1 : rows);
};

const rowsOf = (widget: Widget) => gridRows(widget.blocks.map(getLayout));

/** A change may not make a widget taller than the limit (or than it already is, if it's over). */
export const fitsRowLimit = (before: Widget, after: Widget) =>
  rowsOf(after) <= Math.max(MAX_ROWS, rowsOf(before));

/**
 * Re-places every block, top to bottom and keeping its size, at the first free spot within the
 * row limit. Used to fit widgets migrated from the 2-column grid; null if they can't fit.
 */
export const packIntoRows = (widget: Widget): Widget | null => {
  const placed: { id: string; layout: BlockLayout }[] = [];
  const ordered = [...widget.blocks].sort(
    (left, right) =>
      getLayout(left).y - getLayout(right).y || getLayout(left).x - getLayout(right).x,
  );
  for (const block of ordered) {
    const { width, height } = getLayout(block);
    const spot = findFreeSpot(
      placed.map((item) => item.layout),
      { width, height },
      { columns: MAX_COLUMNS, rows: MAX_ROWS },
    );
    if (!spot) return null;
    placed.push({ id: block.id, layout: spot });
  }
  const layouts = new Map(placed.map((item) => [item.id, item.layout]));
  return {
    ...widget,
    blocks: widget.blocks.map((block) => ({
      ...block,
      config: { ...block.config, layout: layouts.get(block.id)! },
    })),
  };
};

export const occupiedRows = (widget: Widget) =>
  Math.max(1, ...widget.blocks.map((block) => getLayout(block).y + getLayout(block).height));

/**
 * Brings a widget from the API or local cache into the shape the editor works with: every block
 * has a clamped layout and its own username (legacy widgets kept it on the widget), sizes are
 * recomputed, and removed options fall back to defaults. `changed` means it should be saved.
 */
export const normalizeWidget = (widget: Widget) => {
  const legacySources = widget.config?.sources ?? {};
  const paletteMode: PaletteMode = widget.config?.paletteMode === 'dark' ? 'dark' : 'light';
  let changed =
    widget.config?.grid?.columns !== MAX_COLUMNS || widget.config?.paletteMode !== paletteMode;
  const blocks = [...widget.blocks]
    .sort((left, right) => left.position - right.position)
    .map((block, index) => {
      const layout = layoutFromBlock(block, index);
      const source = sourceForBlock(block.type);
      const currentUsername =
        typeof block.config.username === 'string' ? block.config.username : '';
      const legacyUsername = source ? legacySources[source]?.username : undefined;
      const username = currentUsername || legacyUsername;
      if (!block.config.layout || (source && !currentUsername && legacyUsername)) changed = true;
      return {
        ...block,
        position: index,
        config: {
          ...block.config,
          ...(source && username ? { username } : {}),
          layout,
        },
      };
    });
  const dimensions = getWidgetDimensions(blocks);
  changed = changed || widget.width !== dimensions.width || widget.height !== dimensions.height;

  return {
    widget: {
      ...widget,
      ...dimensions,
      config: {
        ...widget.config,
        palette: widget.config?.palette ?? 'lavender',
        paletteMode,
        grid: { columns: MAX_COLUMNS },
        renderFormat: 'iframe' as const,
      },
      blocks,
    },
    changed,
  };
};
