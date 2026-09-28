import { Grip, TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import type { PointerEvent } from 'react';

import { blockStyleVars, WidgetBlockContent } from '@/entities/widget';
import type { RenderedBlock, WidgetBlock } from '@/entities/widget/model';
import canvasStyles from '@/entities/widget/ui/WidgetCanvas.module.css';
import { blockSizes, getLayout } from '@/pages/widget-editor/model/layout';
import type { Locale } from '@/shared/locale/content';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

export type BlockPointerHandlers = {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>, blockId: string) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: () => void;
};

type EditorBlockProps = {
  block: WidgetBlock;
  rendered?: RenderedBlock;
  locale: Locale;
  selected: boolean;
  dragging: boolean;
  removeLabel: string;
  pointerHandlers: BlockPointerHandlers;
  onSelect: () => void;
  onRemove: () => void;
  onResize: (width: number, height: number) => void;
};

export const EditorBlock = ({
  block,
  rendered,
  locale,
  selected,
  dragging,
  removeLabel,
  pointerHandlers,
  onSelect,
  onRemove,
  onResize,
}: EditorBlockProps) => {
  const layout = getLayout(block);
  return (
    <article
      className={`${canvasStyles.block} ${styles.sortableBlock} ${selected ? canvasStyles.selected : ''} ${dragging ? styles.draggingBlock : ''}`}
      data-block-id={block.id}
      style={blockStyleVars(layout)}
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
      <div className={styles.sizeControls} onClick={(event) => event.stopPropagation()}>
        {blockSizes.map((size) => (
          <button
            className={
              layout.width === size.width && layout.height === size.height
                ? styles.sizeButtonActive
                : styles.sizeButton
            }
            key={size.label}
            type="button"
            aria-pressed={layout.width === size.width && layout.height === size.height}
            onClick={() => onResize(size.width, size.height)}
          >
            {size.label}
          </button>
        ))}
      </div>
      <WidgetBlockContent block={block} rendered={rendered} locale={locale} />
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
    </article>
  );
};
