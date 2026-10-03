import type { RefObject } from 'react';

import { ScaledWidgetFrame, WidgetSurface } from '@/entities/widget';
import { paletteTokens, type RenderedBlock, type Widget } from '@/entities/widget/model';
import { WIDGET_WIDTH, blockBox, canvasPadding, widgetDimensions } from '@shared/widget/geometry';
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

const padding = canvasPadding(WIDGET_WIDTH);

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
  const cell = (x: number, y: number) =>
    blockBox(
      { x, y, width: 1, height: 1 },
      { width: WIDGET_WIDTH, height: canvasHeight, rows: displayRows },
    );

  return (
    <ScaledWidgetFrame
      className={styles.canvasFrame}
      width={WIDGET_WIDTH}
      height={canvasHeight}
      elevated
      accent={paletteTokens[widget.config.palette]?.light.accent}
    >
      <WidgetSurface
        blocks={widget.blocks}
        renderedBlocks={Object.values(previews)}
        palette={widget.config.palette}
        paletteMode={widget.config.paletteMode}
        width={WIDGET_WIDTH}
        height={canvasHeight}
        rows={displayRows}
        locale={locale}
        emptyText={
          locale === 'ru' ? 'Добавьте первый блок слева.' : 'Add your first block from the library.'
        }
        renderBlock={({ block, box, content }) => (
          <EditorBlock
            key={block.id}
            block={block}
            box={box}
            selected={block.id === selectedBlockId}
            dragging={draggingBlockId === block.id}
            removeLabel={t.removeBlock}
            pointerHandlers={pointerHandlers}
            onSelect={() => onSelectBlock(block.id)}
            onRemove={() => onRemoveBlock(block.id)}
            onResize={(width, height) => onResizeBlock(block.id, width, height)}
          >
            {content}
          </EditorBlock>
        )}
      >
        {/* Grid area used for pointer math; shows drop targets while dragging. */}
        <div
          ref={gridRef}
          className={styles.dropLayer}
          style={{
            left: padding,
            top: padding,
            width: WIDGET_WIDTH - padding * 2,
            height: canvasHeight - padding * 2,
          }}
        >
          {draggingBlockId &&
            Array.from({ length: dropRows * MAX_COLUMNS }, (_, index) => {
              const x = index % MAX_COLUMNS;
              const y = Math.floor(index / MAX_COLUMNS);
              const box = cell(x, y);
              const isActive = dropCell?.x === x && dropCell.y === y;
              return (
                <div
                  className={`${styles.dropCell} ${isActive ? styles.dropCellActive : ''}`}
                  key={`${x}:${y}`}
                  style={{
                    left: box.x - padding,
                    top: box.y - padding,
                    width: box.width,
                    height: box.height,
                  }}
                />
              );
            })}
        </div>
      </WidgetSurface>
    </ScaledWidgetFrame>
  );
};
