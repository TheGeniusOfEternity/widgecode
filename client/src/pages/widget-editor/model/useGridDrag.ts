import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import type { Widget } from '@/entities/widget/model';
import { GRID_GAP } from '@shared/widget/geometry';
import {
  MAX_COLUMNS,
  clamp,
  getLayout,
  moveBlock,
  placeBlock,
} from '@/pages/widget-editor/model/layout';

type Cell = { x: number; y: number };

/**
 * Pointer drag between grid cells and size presets for editor blocks. Works on a scaled canvas:
 * pointer math converts screen pixels to grid cells using the grid's rendered size.
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
    const elements = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>('[data-block-id]') ?? [],
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
    const cell = drag.preview;
    animateLayoutChange(() => updateLocalWidget((widget) => moveBlock(widget, drag.blockId, cell)));
  };

  const resizeBlock = (blockId: string, width: number, height: number) => {
    const block = widgetRef.current?.blocks.find((item) => item.id === blockId);
    if (!block) return;
    const nextLayout = { ...getLayout(block), width, height };
    animateLayoutChange(() =>
      updateLocalWidget((widget) => placeBlock(widget, blockId, nextLayout)),
    );
  };

  return {
    gridRef,
    draggingBlockId,
    dropCell,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: endDrag },
    resizeBlock,
  };
};
