import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import type { Widget } from '@/entities/widget/model';
import { GRID_GAP } from '@shared/widget/geometry';
import {
  MAX_COLUMNS,
  canPlaceBlock,
  clamp,
  findPlacement,
  getLayout,
  withBlockLayout,
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

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const current = widgetRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !current) return;
    const block = current.blocks.find((item) => item.id === drag.blockId);
    if (block) {
      const nextLayout = { ...getLayout(block), ...drag.preview };
      if (canPlaceBlock(current, drag.blockId, nextLayout)) {
        updateLocalWidget((widget) => withBlockLayout(widget, drag.blockId, nextLayout));
      }
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    endDrag();
  };

  // FLIP animation from the old block rect to the new one after a size change.
  const animateResize = (blockId: string, applyChange: () => void) => {
    const blockElement = gridRef.current?.querySelector<HTMLElement>(
      `[data-block-id="${CSS.escape(blockId)}"]`,
    );
    const first = blockElement?.getBoundingClientRect();
    flushSync(applyChange);
    if (
      !blockElement ||
      !first ||
      !blockElement.animate ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    requestAnimationFrame(() => {
      const last = blockElement.getBoundingClientRect();
      if (!last.width || !last.height) return;
      // The canvas may be scaled down; translate in the block's own (unscaled) pixels.
      const scale = last.width / blockElement.offsetWidth || 1;
      blockElement.animate(
        [
          {
            transform: `translate(${(first.left - last.left) / scale}px, ${(first.top - last.top) / scale}px) scale(${first.width / last.width}, ${first.height / last.height})`,
            transformOrigin: 'top left',
          },
          { transform: 'translate(0, 0) scale(1, 1)', transformOrigin: 'top left' },
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    });
  };

  const resizeBlock = (blockId: string, width: number, height: number) => {
    const current = widgetRef.current;
    const block = current?.blocks.find((item) => item.id === blockId);
    if (!current || !block) return;
    const { x, y } = getLayout(block);
    const nextLayout = findPlacement(current, blockId, width, height, x, y);
    if (!nextLayout) return;
    animateResize(blockId, () =>
      updateLocalWidget((widget) => withBlockLayout(widget, blockId, nextLayout)),
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
