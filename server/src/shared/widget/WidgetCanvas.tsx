// Widget as a single standalone SVG document (the `/image.svg` export).
import { widgetLabels, type WidgetLocale } from './theme.js';
import type { WidgetCanvasBlock, WidgetCanvasRenderedBlock } from './types.js';
import {
  BlockShell,
  CanvasBackground,
  CanvasEmptyState,
  canvasBoxes,
  canvasTokens,
} from './canvasParts.js';
import { clamp } from './svgPrimitives.js';

export { languageColor } from './theme.js';
export { WIDGET_FONT_FAMILY } from './canvasParts.js';
export type { WidgetCanvasBlock, WidgetCanvasRenderedBlock } from './types.js';

export type WidgetCanvasProps = {
  title?: string;
  blocks: WidgetCanvasBlock[];
  palette?: string;
  paletteMode?: string;
  columns?: number;
  width?: number;
  height?: number;
  outputWidth?: number;
  outputHeight?: number;
  renderedBlocks?: WidgetCanvasRenderedBlock[];
  avatarDataUris?: Record<string, string>;
  locale?: WidgetLocale;
};

export const WidgetCanvas = ({
  title = 'WidgeCode widget',
  blocks,
  palette = 'lavender',
  paletteMode = 'light',
  columns,
  width = 600,
  height = 400,
  outputWidth,
  outputHeight,
  renderedBlocks = [],
  avatarDataUris,
  locale = 'en',
}: WidgetCanvasProps) => {
  const canvasWidth = clamp(Math.round(width), 280, 1600);
  const canvasHeight = clamp(Math.round(height), 160, 1200);
  const tokens = canvasTokens(palette, paletteMode);
  const boxes = canvasBoxes(blocks, { width: canvasWidth, height: canvasHeight, columns });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={outputWidth ?? canvasWidth}
      height={outputHeight ?? canvasHeight}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby="widget-title widget-description"
    >
      <title id="widget-title">{title}</title>
      <desc id="widget-description">Live developer statistics widget</desc>
      <CanvasBackground width={canvasWidth} height={canvasHeight} tokens={tokens} />
      {blocks.length === 0 && (
        <CanvasEmptyState
          width={canvasWidth}
          height={canvasHeight}
          tokens={tokens}
          text={widgetLabels(locale).empty}
        />
      )}
      {blocks.map((block, index) => (
        <BlockShell
          key={block.id}
          block={block}
          rendered={renderedBlocks.find((item) => item.id === block.id)}
          box={boxes[index]}
          tokens={tokens}
          locale={locale}
          avatarDataUri={avatarDataUris?.[block.id]}
        />
      ))}
    </svg>
  );
};
