import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import type { BlockLayout, Widget } from '@/entities/widget/model';
import { snapToAllowedSize } from '@shared/widget/blockSizes';
import { GRID_GAP, MAX_BLOCK_HEIGHT } from '@shared/widget/geometry';
import {
  MAX_COLUMNS,
  MAX_ROWS,
  clamp,
  fitsRowLimit,
  getLayout,
  moveBlock,
  occupiedRows,
  placeBlock,
} from '@/pages/widget-editor/model/layout';

type Cell = { x: number; y: number };
export type ResizePreview = { blockId: string; layout: BlockLayout };

/**
 * Pointer drag between grid cells and corner resizing (snapped to the block type's allowed sizes)
 * for editor blocks. Works on a scaled canvas: pointer math converts screen pixels to grid cells
 * using the grid area's rendered size. Changes that would exceed the row limit are rejected.
 */
export const useGridDrag = ({
  widgetRef,
  updateLocalWidget,
  onDragStart,
}: {
  widgetRef: RefObject<Widget | null>;
  updateLocalWidget: (updater: (current: Widget) => Widget) => void;
  onDragStart: (blockId: string) => void;
}) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ blockId: string; pointerId: number; preview: Cell } | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dropCell, setDropCell] = useState<Cell | null>(null);
  const resizeRef = useRef<{ blockId: string; pointerId: number; preview: BlockLayout } | null>(
    null,
  );
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);
  const [isRowLimitHit, setRowLimitHit] = useState(false);

  const rawCellFromPoint = (clientX: number, clientY: number): Cell | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const bounds = grid.getBoundingClientRect();
    const gap = GRID_GAP * (bounds.width / grid.offsetWidth || 1);
    const cell = (bounds.width - gap * (MAX_COLUMNS - 1)) / MAX_COLUMNS;
    if (cell <= 0) return null;
    return {
      x: Math.floor((clientX - bounds.left) / (cell + gap)),
      y: Math.floor((clientY - bounds.top) / (cell + gap)),
    };
  };

  const cellFromPoint = (clientX: number, clientY: number, width: number): Cell | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const bounds = grid.getBoundingClientRect();
    // Bounds are in screen pixels, which differ from layout pixels when the canvas is scaled.
    const gap = GRID_GAP * (bounds.width / grid.offsetWidth || 1);
    const cell = (bounds.width - gap * (MAX_COLUMNS - 1)) / MAX_COLUMNS;
    if (cell <= 0) return null;
    return {
      x: clamp(Math.floor((clientX - bounds.left) / (cell + gap)), 0, MAX_COLUMNS - width),
      y: clamp(Math.floor((clientY - bounds.top) / (cell + gap)), 0, 100),
    };
  };

  const endDrag = () => {
    dragRef.current = null;
    setDraggingBlockId(null);
    setDropCell(null);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, blockId: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const block = widgetRef.current?.blocks.find((item) => item.id === blockId);
    if (!block) return;
    const { x, y } = getLayout(block);
    dragRef.current = { blockId, pointerId: event.pointerId, preview: { x, y } };
    setDraggingBlockId(blockId);
    setDropCell({ x, y });
    onDragStart(blockId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    event.preventDefault();
    const block = widgetRef.current?.blocks.find((item) => item.id === drag.blockId);
    if (!block) return;
    const cell = cellFromPoint(event.clientX, event.clientY, getLayout(block).width);
    if (!cell) return;
    drag.preview = cell;
    setDropCell(cell);
  };

  // FLIP: every block that moves (the edited one and those pushed aside) animates from its old
  // rect to the new one instead of jumping.
  const animateLayoutChange = (applyChange: () => void) => {
    // Blocks are siblings of the grid area layer inside the widget surface.
    const elements = Array.from(
      gridRef.current?.parentElement?.querySelectorAll<HTMLElement>('[data-block-id]') ?? [],
    );
    const before = new Map(elements.map((element) => [element, element.getBoundingClientRect()]));
    flushSync(applyChange);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    requestAnimationFrame(() => {
      for (const [element, first] of before) {
        if (!element.isConnected || !element.animate) continue;
        const last = element.getBoundingClientRect();
        if (!last.width || !last.height) continue;
        const moved =
          first.left !== last.left ||
          first.top !== last.top ||
          first.width !== last.width ||
          first.height !== last.height;
        if (!moved) continue;
        // The canvas may be scaled down; translate in the block's own (unscaled) pixels.
        const scale = last.width / element.offsetWidth || 1;
        element.animate(
          [
            {
              transform: `translate(${(first.left - last.left) / scale}px, ${(first.top - last.top) / scale}px) scale(${first.width / last.width}, ${first.height / last.height})`,
              transformOrigin: 'top left',
            },
            { transform: 'translate(0, 0) scale(1, 1)', transformOrigin: 'top left' },
          ],
          { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      }
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const current = widgetRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const block = current.blocks.find((item) => item.id === drag.blockId);
    const layout = block ? getLayout(block) : null;
    endDrag();
    if (!layout || (layout.x === drag.preview.x && layout.y === drag.preview.y)) return;
    applyIfFits(current, moveBlock(current, drag.blockId, drag.preview));
  };

  const applyIfFits = (current: Widget, next: Widget) => {
    if (!fitsRowLimit(current, next)) {
      setRowLimitHit(true);
      return;
    }
    setRowLimitHit(false);
    animateLayoutChange(() => updateLocalWidget(() => next));
  };

  const endResize = () => {
    resizeRef.current = null;
    setResizePreview(null);
  };

  const onResizePointerDown = (event: PointerEvent<HTMLButtonElement>, blockId: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const block = widgetRef.current?.blocks.find((item) => item.id === blockId);
    if (!block) return;
    const layout = getLayout(block);
    resizeRef.current = { blockId, pointerId: event.pointerId, preview: layout };
    setResizePreview({ blockId, layout });
    onDragStart(blockId);
  };

  const onResizePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    const current = widgetRef.current;
    if (resize?.pointerId !== event.pointerId || !current) return;
    event.preventDefault();
    const block = current.blocks.find((item) => item.id === resize.blockId);
    const cell = rawCellFromPoint(event.clientX, event.clientY);
    if (!block || !cell) return;
    const origin = getLayout(block);
    const rowLimit = Math.max(MAX_ROWS, occupiedRows(current));
    const maxWidth = MAX_COLUMNS - origin.x;
    const maxHeight = Math.min(MAX_BLOCK_HEIGHT, rowLimit - origin.y);
    const size = snapToAllowedSize(
      block.type,
      clamp(cell.x - origin.x + 1, 1, maxWidth),
      clamp(cell.y - origin.y + 1, 1, maxHeight),
      { maxWidth, maxHeight },
    );
    // A size wider than the space to the right shifts the block left (as placeBlock would).
    const preview = { x: Math.min(origin.x, MAX_COLUMNS - size.width), y: origin.y, ...size };
    resize.preview = preview;
    setResizePreview({ blockId: resize.blockId, layout: preview });
  };

  const onResizePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    const current = widgetRef.current;
    if (!resize || resize.pointerId !== event.pointerId || !current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    endResize();
    const block = current.blocks.find((item) => item.id === resize.blockId);
    if (!block) return;
    const layout = getLayout(block);
    const { preview } = resize;
    if (
      layout.width === preview.width &&
      layout.height === preview.height &&
      layout.x === preview.x
    ) {
      return;
    }
    applyIfFits(current, placeBlock(current, resize.blockId, preview));
  };

  return {
    gridRef,
    draggingBlockId,
    dropCell,
    resizePreview,
    isRowLimitHit,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: endDrag },
    resizeHandlers: {
      onPointerDown: onResizePointerDown,
      onPointerMove: onResizePointerMove,
      onPointerUp: onResizePointerUp,
      onPointerCancel: endResize,
    },
  };
};
