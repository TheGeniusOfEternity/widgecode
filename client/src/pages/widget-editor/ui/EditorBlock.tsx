import { Grip, TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import type { PointerEvent, ReactNode } from 'react';

import type { WidgetBlock } from '@/entities/widget/model';
import type { BlockBox } from '@shared/widget/canvasParts';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

export type BlockPointerHandlers = {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>, blockId: string) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: () => void;
};

type EditorBlockProps = {
  block: WidgetBlock;
  /** Position inside the canvas, in widget pixels. */
  box: BlockBox;
  /** The block's SVG, rendered by WidgetSurface. */
  children: ReactNode;
  selected: boolean;
  dragging: boolean;
  removeLabel: string;
  pointerHandlers: BlockPointerHandlers;
  /** Corner handle: drag to resize, snapping to the block's allowed sizes. */
  resizeHandlers: BlockPointerHandlers;
  resizeLabel: string;
  onSelect: () => void;
  onRemove: () => void;
};

export const EditorBlock = ({
  block,
  box,
  children,
  selected,
  dragging,
  removeLabel,
  pointerHandlers,
  resizeHandlers,
  resizeLabel,
  onSelect,
  onRemove,
}: EditorBlockProps) => (
  <article
    className={`${styles.sortableBlock} ${selected ? styles.selectedBlock : ''} ${dragging ? styles.draggingBlock : ''}`}
    data-block-id={block.id}
    style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
    onClick={onSelect}
  >
    <button
      className={`${styles.dragHandle} widget-drag-handle`}
      type="button"
      aria-label="Move block"
      onPointerDown={(event) => pointerHandlers.onPointerDown(event, block.id)}
      onPointerMove={pointerHandlers.onPointerMove}
      onPointerUp={pointerHandlers.onPointerUp}
      onPointerCancel={pointerHandlers.onPointerCancel}
    >
      <Icon data={Grip} size={16} />
    </button>
    {children}
    <button
      className={styles.removeBlock}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      aria-label={removeLabel}
    >
      <Icon data={TrashBin} size={15} />
    </button>
    <button
      className={styles.resizeHandle}
      type="button"
      aria-label={resizeLabel}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => resizeHandlers.onPointerDown(event, block.id)}
      onPointerMove={resizeHandlers.onPointerMove}
      onPointerUp={resizeHandlers.onPointerUp}
      onPointerCancel={resizeHandlers.onPointerCancel}
    />
  </article>
);
