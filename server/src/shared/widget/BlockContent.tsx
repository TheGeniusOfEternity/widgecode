// Content of one widget block, drawn in the block's content box (origin at its top-left).
// Shared states live here; each block type renders its size variants in ./blocks/.
import { blockVariant } from './blockSizes.js';
import { BLOCK_LINE_HEIGHT } from './geometry.js';
import { errorColor, widgetLabels, type PaletteTokens, type WidgetLocale } from './theme.js';
import type { WidgetCanvasBlock, WidgetCanvasRenderedBlock } from './types.js';
import { blockRenderers } from './blocks/index.js';
import { wrapText } from './blocks/parts.js';
import {
  MultilineText,
  PreviewState,
  SvgText,
  asRecord,
  asString,
  baseline,
  layoutOf,
  linesOf,
  type BlockFrame,
} from './svgPrimitives.js';

// Placeholder while live data loads (editor and public page; exports always have data).
const BlockSkeleton = ({ frame, tokens }: { frame: BlockFrame; tokens: PaletteTokens }) => {
  const line = (y: number, width: number, height = 10) => (
    <rect
      className="wc-skeleton"
      y={y}
      width={frame.width * width}
      height={height}
      rx={height / 2}
      fill={tokens.ink}
      fillOpacity={0.1}
    />
  );
  return (
    <g aria-hidden="true">
      <style>
        {
          '.wc-skeleton{animation:wc-pulse 1.4s ease-in-out infinite}@keyframes wc-pulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion:reduce){.wc-skeleton{animation:none}}'
        }
      </style>
      {line(0, 0.68)}
      {line(22, 0.46)}
      {line(44, 0.3)}
      {line(74, 0.26, 38)}
    </g>
  );
};

// "Add a username" for blocks too small for the full PreviewState.
const CompactPreview = ({
  frame,
  tokens,
  locale,
}: {
  frame: BlockFrame;
  tokens: PaletteTokens;
  locale: WidgetLocale;
}) => {
  const lines = wrapText(widgetLabels(locale).addUsername, frame.width, 11, {
    weight: 700,
    maxLines: 2,
  });
  const markSize = 26;
  const height = markSize + 8 + lines.length * 11 * BLOCK_LINE_HEIGHT;
  const top = Math.max((frame.height - height) / 2, 0);
  return (
    <g>
      <rect
        x={(frame.width - markSize) / 2}
        y={top}
        width={markSize}
        height={markSize}
        rx={8}
        fill={tokens.accent}
        fillOpacity={0.12}
        stroke={tokens.accent}
        strokeOpacity={0.34}
      />
      <SvgText
        x={frame.width / 2}
        y={baseline(top + (markSize - 13 * BLOCK_LINE_HEIGHT) / 2, 13)}
        value="@"
        fill={tokens.accent}
        size={13}
        weight={800}
        anchor="middle"
      />
      <MultilineText
        x={frame.width / 2}
        top={top + markSize + 8}
        lineHeight={BLOCK_LINE_HEIGHT}
        lines={lines}
        fill={tokens.ink}
        size={11}
        weight={700}
        anchor="middle"
      />
    </g>
  );
};

export const BlockContent = ({
  block,
  rendered,
  tokens,
  locale,
  frame,
  avatarDataUri,
}: {
  block: WidgetCanvasBlock;
  rendered?: WidgetCanvasRenderedBlock;
  tokens: PaletteTokens;
  locale: WidgetLocale;
  frame: BlockFrame;
  avatarDataUri?: string;
}) => {
  const config = asRecord(block.config);
  const username = asString(config.username);
  const source = block.type.startsWith('github')
    ? 'GitHub'
    : block.type.startsWith('leetcode')
      ? 'LeetCode'
      : null;
  const layout = layoutOf(block);
  const context = {
    block,
    variant: blockVariant(layout.width, layout.height),
    config,
    data: asRecord(rendered?.data),
    labels: widgetLabels(locale),
    t: frame.typography,
    frame,
    tokens,
    locale,
    username,
    avatarDataUri,
  };

  if (rendered?.error) {
    return (
      <MultilineText
        x={0}
        top={0}
        lineHeight={1.5}
        lines={linesOf(
          rendered.error,
          Math.floor(frame.width / (13 * 0.52)),
          Math.max(Math.floor(frame.height / 19.5), 1),
        )}
        fill={errorColor}
        size={13}
      />
    );
  }

  if (block.type === 'text') return blockRenderers.text(context);

  if (source && !username && !rendered?.data) {
    return frame.width < 200 || frame.height < 90 ? (
      <CompactPreview frame={frame} tokens={tokens} locale={locale} />
    ) : (
      <PreviewState source={source} frame={frame} tokens={tokens} locale={locale} />
    );
  }

  if (!rendered?.data) return <BlockSkeleton frame={frame} tokens={tokens} />;

  return blockRenderers[block.type]?.(context) ?? null;
};
