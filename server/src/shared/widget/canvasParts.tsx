// Pieces of a widget canvas. The SVG export composes them into one <svg>; the browser places
// the background and each block in their own <svg> (so the editor can attach controls to a
// block) — same components, same geometry.
import {
  BLOCK_BORDER,
  BLOCK_PADDING,
  BLOCK_RADIUS,
  CANVAS_RADIUS,
  MAX_GRID_COLUMNS,
  blockBox,
  blockContentWidth,
  blockTypography,
  gridRows,
} from './geometry.js';
import { paletteTokens, type PaletteName, type PaletteTokens, type WidgetLocale } from './theme.js';
import type { WidgetCanvasBlock, WidgetCanvasRenderedBlock } from './types.js';
import { BlockContent } from './BlockContent.js';
import { SvgText, clamp, layoutOf, mixHex, safeId } from './svgPrimitives.js';

export const WIDGET_FONT_FAMILY =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

export const canvasTokens = (palette?: string, paletteMode?: string): PaletteTokens => {
  const set = paletteTokens[palette as PaletteName] ?? paletteTokens.lavender;
  return paletteMode === 'dark' ? set.dark : set.light;
};

export type BlockBox = { x: number; y: number; width: number; height: number };

/**
 * Pixel boxes of all blocks. `rows` overrides the row count derived from the blocks (the editor
 * shows a spare drop row while dragging).
 */
export const canvasBoxes = (
  blocks: WidgetCanvasBlock[],
  canvas: { width: number; height: number; columns?: number; rows?: number },
): BlockBox[] => {
  const layouts = blocks.map(layoutOf);
  const rows = canvas.rows ?? gridRows(layouts);
  const columns = clamp(Math.round(canvas.columns ?? MAX_GRID_COLUMNS), 1, MAX_GRID_COLUMNS);
  return layouts.map((layout) =>
    blockBox(layout, { width: canvas.width, height: canvas.height, columns, rows }),
  );
};

/** Canvas surface: gradient, accent glow and border. Ids are prefixed to stay unique per page. */
export const CanvasBackground = ({
  width,
  height,
  tokens,
  idPrefix = 'widget',
}: {
  width: number;
  height: number;
  tokens: PaletteTokens;
  idPrefix?: string;
}) => {
  // CSS `radial-gradient(circle at 92% 2%, … 32%)` sizes to the farthest corner (bottom-left).
  const glowRadius = Math.hypot(width * 0.92, height * 0.98) * 0.32;
  return (
    <>
      <defs>
        <linearGradient id={`${idPrefix}-surface`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tokens.surface} />
          <stop offset="100%" stopColor={tokens.soft} />
        </linearGradient>
        <radialGradient
          id={`${idPrefix}-accent-glow`}
          gradientUnits="userSpaceOnUse"
          cx={width * 0.92}
          cy={height * 0.02}
          r={glowRadius}
        >
          <stop offset="0%" stopColor={tokens.accent} stopOpacity={0.22} />
          <stop offset="100%" stopColor={tokens.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={CANVAS_RADIUS}
        fill={`url(#${idPrefix}-surface)`}
      />
      <rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={CANVAS_RADIUS}
        fill={`url(#${idPrefix}-accent-glow)`}
        stroke={tokens.accent}
        strokeOpacity={0.25}
      />
    </>
  );
};

export const CanvasEmptyState = ({
  width,
  height,
  tokens,
  text,
}: {
  width: number;
  height: number;
  tokens: PaletteTokens;
  text: string;
}) => (
  <g fontFamily={WIDGET_FONT_FAMILY}>
    <SvgText
      x={width / 2}
      y={height / 2}
      value={text}
      fill={tokens.ink}
      size={14}
      anchor="middle"
      opacity={0.6}
    />
  </g>
);

/** One block: surface, border and clipped content, drawn at `box` in the parent's coordinates. */
export const BlockShell = ({
  block,
  rendered,
  box,
  tokens,
  locale,
  avatarDataUri,
  idPrefix = 'block',
}: {
  block: WidgetCanvasBlock;
  rendered?: WidgetCanvasRenderedBlock;
  box: BlockBox;
  tokens: PaletteTokens;
  locale: WidgetLocale;
  avatarDataUri?: string;
  idPrefix?: string;
}) => {
  const inset = BLOCK_BORDER + BLOCK_PADDING;
  const contentWidth = blockContentWidth(box.width);
  const frame = {
    width: contentWidth,
    height: Math.max(box.height - inset * 2, 0),
    typography: blockTypography(contentWidth),
  };
  const clipId = `${idPrefix}-${safeId(block.id)}`;
  return (
    <g fontFamily={WIDGET_FONT_FAMILY}>
      <clipPath id={clipId}>
        <rect x={box.x} y={box.y} width={box.width} height={box.height} rx={BLOCK_RADIUS} />
      </clipPath>
      <rect
        x={box.x + 0.5}
        y={box.y + 0.5}
        width={box.width - 1}
        height={box.height - 1}
        rx={BLOCK_RADIUS}
        fill={mixHex(tokens.surface, tokens.soft, 0.72)}
        stroke={tokens.accent}
        strokeOpacity={0.18}
      />
      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(${box.x + inset} ${box.y + inset})`}>
          <BlockContent
            block={block}
            rendered={rendered}
            tokens={tokens}
            locale={locale}
            frame={frame}
            avatarDataUri={avatarDataUri}
          />
        </g>
      </g>
    </g>
  );
};
