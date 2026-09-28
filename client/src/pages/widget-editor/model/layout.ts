import { MAX_GRID_COLUMNS, widgetDimensions } from '@shared/widget/geometry';
import type {
  BlockLayout,
  BlockType,
  PaletteMode,
  SourceType,
  Widget,
  WidgetBlock,
} from '@/entities/widget/model';

export const MAX_BLOCKS = 5;
export const MAX_COLUMNS = MAX_GRID_COLUMNS;
const MAX_ROW = 100;
const DEFAULT_LAYOUT: BlockLayout = { x: 0, y: 0, width: 1, height: 1 };

export const blockSizes = [
  { width: 1, height: 1, label: '1 × 1' },
  { width: 1, height: 2, label: '1 × 2' },
  { width: 2, height: 1, label: '2 × 1' },
  { width: 2, height: 2, label: '2 × 2' },
] as const;

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
  const value =
    input && typeof input === 'object' ? (input as Partial<BlockLayout>) : DEFAULT_LAYOUT;
  const x = clamp(typeof value.x === 'number' ? value.x : 0, 0, MAX_COLUMNS - 1);
  const width = clamp(typeof value.width === 'number' ? value.width : 1, 1, MAX_COLUMNS - x);
  return {
    x,
    y: clamp(typeof value.y === 'number' ? value.y : index, 0, MAX_ROW),
    width,
    height: clamp(typeof value.height === 'number' ? value.height : 1, 1, 2),
  };
};

export const getWidgetDimensions = (blocks: WidgetBlock[]) =>
  widgetDimensions(blocks.map(layoutFromBlock));

export const layoutsFor = (widget: Widget) =>
  widget.blocks.map((block) => ({ blockId: block.id, layout: getLayout(block) }));

const layoutsOverlap = (left: BlockLayout, right: BlockLayout) =>
  left.x < right.x + right.width &&
  left.x + left.width > right.x &&
  left.y < right.y + right.height &&
  left.y + left.height > right.y;

export const canPlaceBlock = (widget: Widget, blockId: string, nextLayout: BlockLayout) =>
  nextLayout.x >= 0 &&
  nextLayout.x + nextLayout.width <= MAX_COLUMNS &&
  !widget.blocks.some(
    (block) => block.id !== blockId && layoutsOverlap(nextLayout, getLayout(block)),
  );

/** First free spot for a block of the given size: the preferred cell, then scanning down column 0. */
export const findPlacement = (
  widget: Widget,
  blockId: string,
  width: number,
  height: number,
  preferredX: number,
  preferredY: number,
) => {
  const startY = clamp(preferredY, 0, MAX_ROW);
  const startX = clamp(preferredX, 0, MAX_COLUMNS - width);
  const candidates = [
    { x: startX, y: startY },
    ...Array.from({ length: MAX_ROW + 1 - startY }, (_, index) => ({ x: 0, y: startY + index })),
  ];
  return candidates
    .map(({ x, y }) => ({ x, y, width, height }))
    .find((layout) => canPlaceBlock(widget, blockId, layout));
};

/** Rows shown while dragging: occupied rows plus one spare drop row (at least two). */
export const dragGridRows = (widget: Widget) =>
  Math.min(
    MAX_ROW,
    Math.max(
      2,
      ...widget.blocks.map((block) => {
        const layout = getLayout(block);
        return layout.y + layout.height + 1;
      }),
    ),
  );

export const occupiedRows = (widget: Widget) =>
  Math.max(1, ...widget.blocks.map((block) => getLayout(block).y + getLayout(block).height));

export const withBlockLayout = (widget: Widget, blockId: string, layout: BlockLayout): Widget => ({
  ...widget,
  config: { ...widget.config, grid: { columns: MAX_COLUMNS } },
  blocks: widget.blocks.map((block) =>
    block.id === blockId ? { ...block, config: { ...block.config, layout } } : block,
  ),
});

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
