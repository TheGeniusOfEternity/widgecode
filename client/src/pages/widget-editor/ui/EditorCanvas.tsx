import type { CSSProperties, RefObject } from 'react';

import { canvasStyleVars, ScaledWidgetFrame } from '@/entities/widget';
import { paletteTokens, type RenderedBlock, type Widget } from '@/entities/widget/model';
import canvasStyles from '@/entities/widget/ui/WidgetCanvas.module.css';
import { WIDGET_WIDTH, cellSize, widgetDimensions } from '@shared/widget/geometry';
import { MAX_COLUMNS, dragGridRows, occupiedRows } from '@/pages/widget-editor/model/layout';
import { EditorBlock, type BlockPointerHandlers } from '@/pages/widget-editor/ui/EditorBlock';
import { messages, type Locale } from '@/shared/locale/content';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

type EditorCanvasProps = {
  widget: Widget;
  locale: Locale;
  previews: Record<string, RenderedBlock>;
  selectedBlockId: string | null;
  gridRef: RefObject<HTMLDivElement | null>;
  draggingBlockId: string | null;
  dropCell: { x: number; y: number } | null;
  pointerHandlers: BlockPointerHandlers;
  onSelectBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onResizeBlock: (blockId: string, width: number, height: number) => void;
};

const gridStyle = { '--grid-cell-size': `${cellSize(WIDGET_WIDTH)}px` } as CSSProperties;

/** The widget at its real size (scaled to fit), with drag, resize and selection controls. */
export const EditorCanvas = ({
  widget,
  locale,
  previews,
  selectedBlockId,
  gridRef,
  draggingBlockId,
  dropCell,
  pointerHandlers,
  onSelectBlock,
  onRemoveBlock,
  onResizeBlock,
}: EditorCanvasProps) => {
  const t = messages[locale];
  // While dragging, the grid shows one spare row below the blocks as a drop target.
  const dropRows = dragGridRows(widget);
  const displayRows = draggingBlockId ? dropRows : occupiedRows(widget);
  const canvasHeight =
    widget.blocks.length === 0
      ? widget.height
      : widgetDimensions([{ x: 0, y: displayRows - 1, width: 1, height: 1 }]).height;
  const canvasStyle = {
    ...canvasStyleVars(widget.config.palette, { width: WIDGET_WIDTH }),
    '--widget-columns': MAX_COLUMNS,
  } as CSSProperties;

  return (
    <ScaledWidgetFrame
      className={styles.canvasFrame}
      width={WIDGET_WIDTH}
      height={canvasHeight}
      elevated
      accent={paletteTokens[widget.config.palette]?.light.accent}
    >
      <div
        className={`${canvasStyles.canvas} ${styles.editorSurface}`}
        style={canvasStyle}
        data-palette-mode={widget.config.paletteMode}
        data-interactive="true"
      >
        {widget.blocks.length === 0 ? (
          <p className={canvasStyles.empty}>
            {locale === 'ru'
              ? 'Добавьте первый блок слева.'
              : 'Add your first block from the library.'}
          </p>
        ) : (
          <div className={styles.gridLayoutHost}>
            <div className={styles.editorBlocks} ref={gridRef} style={gridStyle}>
              {draggingBlockId &&
                Array.from({ length: dropRows * MAX_COLUMNS }, (_, index) => {
                  const x = index % MAX_COLUMNS;
                  const y = Math.floor(index / MAX_COLUMNS);
                  const isActive = dropCell?.x === x && dropCell.y === y;
                  return (
                    <div
                      className={`${styles.dropCell} ${isActive ? styles.dropCellActive : ''}`}
                      key={`${x}:${y}`}
                      style={{ gridColumn: x + 1, gridRow: y + 1 }}
                    />
                  );
                })}
              {widget.blocks.map((block) => (
                <EditorBlock
                  key={block.id}
                  block={block}
                  rendered={previews[block.id]}
                  locale={locale}
                  selected={block.id === selectedBlockId}
                  dragging={draggingBlockId === block.id}
                  removeLabel={t.removeBlock}
                  pointerHandlers={pointerHandlers}
                  onSelect={() => onSelectBlock(block.id)}
                  onRemove={() => onRemoveBlock(block.id)}
                  onResize={(width, height) => onResizeBlock(block.id, width, height)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScaledWidgetFrame>
  );
};
