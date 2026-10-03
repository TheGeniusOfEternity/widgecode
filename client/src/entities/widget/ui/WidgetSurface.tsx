import { useId, type CSSProperties, type ReactNode } from 'react';

import type { PaletteId, PaletteMode, RenderedBlock, WidgetBlock } from '@/entities/widget/model';
import {
  BlockShell,
  CanvasBackground,
  CanvasEmptyState,
  canvasBoxes,
  canvasTokens,
  type BlockBox,
} from '@shared/widget/canvasParts';
import { widgetLabels } from '@shared/widget/theme';
import styles from '@/entities/widget/ui/WidgetSurface.module.css';

export type SurfaceBlockSlot = { block: WidgetBlock; box: BlockBox; content: ReactNode };

type WidgetSurfaceProps = {
  blocks: WidgetBlock[];
  renderedBlocks?: RenderedBlock[];
  palette: PaletteId;
  paletteMode?: PaletteMode;
  width: number;
  height: number;
  columns?: number;
  /** Row count override (the editor adds a spare drop row while dragging). */
  rows?: number;
  locale?: 'ru' | 'en';
  emptyText?: string;
  label?: string;
  /** Wraps each positioned block, e.g. to add editor controls. Must return a keyed element. */
  renderBlock?: (slot: SurfaceBlockSlot) => ReactNode;
  /** Extra layers on top of the blocks (drop targets etc.). */
  children?: ReactNode;
};

/**
 * Browser rendering of a widget at its stored size, built from the same SVG parts as the
 * `/image.svg` export: the background and each block are separate SVGs placed with the shared
 * geometry, so the editor can attach DOM controls to individual blocks.
 */
export const WidgetSurface = ({
  blocks,
  renderedBlocks,
  palette,
  paletteMode = 'light',
  width,
  height,
  columns,
  rows,
  locale = 'en',
  emptyText,
  label,
  renderBlock,
  children,
}: WidgetSurfaceProps) => {
  const idPrefix = `w${useId().replace(/[^a-z0-9]/gi, '')}`;
  const tokens = canvasTokens(palette, paletteMode);
  const boxes = canvasBoxes(blocks, { width, height, columns, rows });

  return (
    <div
      className={styles.surface}
      role={label ? 'img' : undefined}
      aria-label={label}
      style={
        {
          width,
          height,
          '--widget-accent': tokens.accent,
          '--widget-ink': tokens.ink,
          '--widget-surface': tokens.surface,
        } as CSSProperties
      }
    >
      <svg
        className={styles.layer}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <CanvasBackground width={width} height={height} tokens={tokens} idPrefix={idPrefix} />
        {blocks.length === 0 && (
          <CanvasEmptyState
            width={width}
            height={height}
            tokens={tokens}
            text={emptyText ?? widgetLabels(locale).empty}
          />
        )}
      </svg>
      {blocks.map((block, index) => {
        const box = boxes[index];
        const content = (
          <svg
            className={styles.blockSvg}
            width={box.width}
            height={box.height}
            viewBox={`0 0 ${box.width} ${box.height}`}
          >
            <BlockShell
              block={block}
              rendered={renderedBlocks?.find((item) => item.id === block.id)}
              box={{ x: 0, y: 0, width: box.width, height: box.height }}
              tokens={tokens}
              locale={locale}
              idPrefix={`${idPrefix}-block`}
            />
          </svg>
        );
        return renderBlock ? (
          renderBlock({ block, box, content })
        ) : (
          <div
            key={block.id}
            className={styles.block}
            style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
          >
            {content}
          </div>
        );
      })}
      {children}
    </div>
  );
};
