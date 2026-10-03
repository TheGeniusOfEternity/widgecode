// Low-level SVG building blocks shared by every widget block renderer.
import {
  BLOCK_LINE_HEIGHT,
  MAX_BLOCK_HEIGHT,
  MAX_GRID_COLUMNS,
  estimateTextWidth,
  type BlockTypography,
  type GridLayout,
} from './geometry.js';
import { formatStatValue, widgetLabels, type PaletteTokens, type WidgetLocale } from './theme.js';
import type { WidgetCanvasBlock } from './types.js';

export const WIDGET_FONT_FAMILY =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

export const numberFormatter = new Intl.NumberFormat('en-US');

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

export const asNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const mixHex = (left: string, right: string, leftWeight: number) => {
  const parse = (value: string) => Number.parseInt(value.replace('#', ''), 16);
  const leftValue = parse(left);
  const rightValue = parse(right);
  const weight = clamp(leftWeight, 0, 1);
  const channel = (shift: number) =>
    Math.round(
      ((leftValue >> shift) & 255) * weight + ((rightValue >> shift) & 255) * (1 - weight),
    );
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
};

export const formatNumber = (value: unknown, fallback = '—') =>
  typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : fallback;

export const imageUrl = (value: unknown) => {
  const url = asString(value);
  return /^https?:\/\//i.test(url) ? url : null;
};

export const safeId = (value: string) => value.replace(/[^a-z0-9_-]/gi, '-');

export const layoutOf = (block: WidgetCanvasBlock): GridLayout => {
  const value = asRecord(asRecord(block.config).layout);
  return {
    x: clamp(asNumber(value.x), 0, MAX_GRID_COLUMNS - 1),
    y: Math.max(0, asNumber(value.y, block.position)),
    width: clamp(asNumber(value.width, 1), 1, MAX_GRID_COLUMNS),
    height: clamp(asNumber(value.height, 1), 1, MAX_BLOCK_HEIGHT),
  };
};

// Inter vertical metrics: ascent 0.96875em, content area 1.2109em.
export const baseline = (top: number, size: number, lineHeight = BLOCK_LINE_HEIGHT) =>
  top + size * ((lineHeight - 1.2109) / 2 + 0.96875);

// SVG has no text layout: cut text with an ellipsis where the HTML canvas would.
export const fitText = (value: string, width: number, size: number, weight = 500) => {
  if (estimateTextWidth(value, size, { weight }) <= width) return value;
  let end = value.length;
  while (end > 1 && estimateTextWidth(`${value.slice(0, end)}…`, size, { weight }) > width) {
    end -= 1;
  }
  return `${value.slice(0, end)}…`;
};

export const linesOf = (value: string, maxLength: number, maxLines: number) => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxLength) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(maxLength - 1, 1))}…`;
  }
  return lines.length > 0 ? lines : [''];
};

export type TextProps = {
  x: number;
  y: number;
  value: unknown;
  fill: string;
  size: number;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  letterSpacing?: string;
};

export const SvgText = ({
  x,
  y,
  value,
  fill,
  size,
  weight = 500,
  anchor = 'start',
  opacity,
  letterSpacing,
}: TextProps) => (
  <text
    x={x}
    y={y}
    fill={fill}
    fontSize={size}
    fontWeight={weight}
    textAnchor={anchor}
    opacity={opacity}
    letterSpacing={letterSpacing}
  >
    {String(value ?? '')}
  </text>
);

export const MultilineText = ({
  top,
  lineHeight,
  lines,
  ...text
}: Omit<TextProps, 'y' | 'value'> & { top: number; lineHeight: number; lines: string[] }) => (
  <>
    {lines.map((line, index) => (
      <SvgText
        key={`${line}-${index}`}
        {...text}
        y={baseline(top + index * text.size * lineHeight, text.size, lineHeight)}
        value={line}
      />
    ))}
  </>
);

export type BlockFrame = { width: number; height: number; typography: BlockTypography };

export type StatItem = { label: string; value: unknown };

// Mirrors `.statsRow` / `.stat` in the HTML canvas: equal columns, value above label.
export const StatsRow = ({
  top,
  items,
  frame,
  tokens,
}: {
  top: number;
  items: StatItem[];
  frame: BlockFrame;
  tokens: PaletteTokens;
}) => {
  const { typography: t } = frame;
  const columnWidth = (frame.width - t.columnGap * (items.length - 1)) / Math.max(items.length, 1);
  const labelTop = top + t.statValue * BLOCK_LINE_HEIGHT + 3;
  return (
    <>
      {items.map((item, index) => {
        const x = index * (columnWidth + t.columnGap);
        return (
          <g key={item.label}>
            <SvgText
              x={x}
              y={baseline(top, t.statValue)}
              value={formatStatValue(item.value, columnWidth, t.statValue)}
              fill={tokens.ink}
              size={t.statValue}
              weight={800}
              letterSpacing="-0.06em"
            />
            <SvgText
              x={x}
              y={baseline(labelTop, t.meta)}
              value={fitText(item.label, columnWidth, t.meta)}
              fill={tokens.ink}
              size={t.meta}
              opacity={0.6}
            />
          </g>
        );
      })}
    </>
  );
};

export const statsRowHeight = (t: BlockTypography) =>
  t.statValue * BLOCK_LINE_HEIGHT + 3 + t.meta * BLOCK_LINE_HEIGHT;

// Mirrors `.blockTitleRow`: bold title on the left, muted meta on the right.
export const TitleRow = ({
  title,
  meta,
  frame,
  tokens,
}: {
  title: string;
  meta: string;
  frame: BlockFrame;
  tokens: PaletteTokens;
}) => {
  const { typography: t } = frame;
  const rowHeight = t.heading * BLOCK_LINE_HEIGHT;
  const metaTop = (rowHeight - t.meta * BLOCK_LINE_HEIGHT) / 2;
  // Like the HTML flex row: the title keeps its width, the meta shrinks (max 45%) with a gap of 12.
  const titleWidth = Math.min(estimateTextWidth(title, t.heading, { weight: 800 }), frame.width);
  const metaMaxWidth = Math.max(Math.min(frame.width * 0.45, frame.width - titleWidth - 12), 0);
  const metaText = fitText(meta, metaMaxWidth, t.meta);
  const metaWidth = metaText ? estimateTextWidth(metaText, t.meta) : 0;
  return (
    <>
      <SvgText
        x={0}
        y={baseline(0, t.heading)}
        value={fitText(title, frame.width - metaWidth - 12, t.heading, 800)}
        fill={tokens.ink}
        size={t.heading}
        weight={800}
      />
      <SvgText
        x={frame.width}
        y={baseline(metaTop, t.meta)}
        value={metaText}
        fill={tokens.ink}
        size={t.meta}
        anchor="end"
        opacity={0.6}
      />
    </>
  );
};

// Mirrors `.previewState` in the HTML canvas.
export const PreviewState = ({
  source,
  frame,
  tokens,
  locale,
}: {
  source: 'GitHub' | 'LeetCode';
  frame: BlockFrame;
  tokens: PaletteTokens;
  locale: WidgetLocale;
}) => {
  const labels = widgetLabels(locale);
  const boxHeight = 76;
  return (
    <g>
      <rect
        x={0.5}
        y={0.5}
        width={frame.width - 1}
        height={boxHeight - 1}
        rx={14}
        fill={tokens.accent}
        fillOpacity={0.07}
        stroke={tokens.accent}
        strokeOpacity={0.3}
        strokeDasharray="5 5"
      />
      <rect
        x={14}
        y={(boxHeight - 32) / 2}
        width={32}
        height={32}
        rx={10}
        fill={tokens.accent}
        fillOpacity={0.12}
        stroke={tokens.accent}
        strokeOpacity={0.34}
      />
      <SvgText
        x={30}
        y={baseline((boxHeight - 13 * BLOCK_LINE_HEIGHT) / 2, 13)}
        value="@"
        fill={tokens.accent}
        size={13}
        weight={800}
        anchor="middle"
      />
      <SvgText
        x={58}
        y={baseline(boxHeight / 2 - 18, 13)}
        value={labels.addUsername}
        fill={tokens.ink}
        size={13}
        weight={700}
      />
      <SvgText
        x={58}
        y={baseline(boxHeight / 2 + 2, 11, 1.4)}
        value={fitText(labels.addUsernameHint(source), frame.width - 72, 11)}
        fill={tokens.ink}
        size={11}
        opacity={0.62}
      />
    </g>
  );
};
