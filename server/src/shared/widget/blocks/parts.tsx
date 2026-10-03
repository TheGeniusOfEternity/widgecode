// Building blocks for size variants (tiles and strips) shared by several block renderers.
import { BLOCK_LINE_HEIGHT, estimateTextWidth } from '../geometry.js';
import { formatStatValue, type PaletteTokens } from '../theme.js';
import { SvgText, baseline, fitText, safeId } from '../svgPrimitives.js';

/** Largest font size (within bounds) at which `text` fits `maxWidth`. */
export const fitFontSize = (
  text: string,
  maxWidth: number,
  {
    max,
    min,
    weight = 800,
    letterSpacing = 0,
  }: {
    max: number;
    min: number;
    weight?: number;
    letterSpacing?: number;
  },
) => {
  for (let size = max; size > min; size -= 0.5) {
    if (estimateTextWidth(text, size, { weight, letterSpacing }) <= maxWidth) return size;
  }
  return min;
};

/** A headline number with a muted caption under it, sized to `width`. */
export const BigStat = ({
  x = 0,
  top,
  width,
  value,
  label,
  tokens,
  maxSize,
  labelSize,
  anchor = 'start',
}: {
  x?: number;
  top: number;
  width: number;
  value: unknown;
  label: string;
  tokens: PaletteTokens;
  maxSize: number;
  labelSize: number;
  anchor?: 'start' | 'middle';
}) => {
  const text = formatStatValue(value, width, maxSize);
  const size = fitFontSize(text, width, { max: maxSize, min: 12, letterSpacing: -0.06 });
  return (
    <g>
      <SvgText
        x={x}
        y={baseline(top, size)}
        value={text}
        fill={tokens.ink}
        size={size}
        weight={800}
        anchor={anchor}
        letterSpacing="-0.06em"
      />
      <SvgText
        x={x}
        y={baseline(top + size * BLOCK_LINE_HEIGHT + 2, labelSize)}
        value={fitText(label, width, labelSize)}
        fill={tokens.ink}
        size={labelSize}
        anchor={anchor}
        opacity={0.6}
      />
    </g>
  );
};

export const bigStatHeight = (size: number, labelSize: number) =>
  size * BLOCK_LINE_HEIGHT + 2 + labelSize * BLOCK_LINE_HEIGHT;

export type BarSegment = { key: string; value: number; fill: string; opacity?: number };

/** Rounded stacked bar; segments are proportional to their values. */
export const SegmentBar = ({
  id,
  y,
  width,
  height = 8,
  segments,
  tokens,
}: {
  id: string;
  y: number;
  width: number;
  height?: number;
  segments: BarSegment[];
  tokens: PaletteTokens;
}) => {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  const clipId = `bar-${safeId(id)}`;
  let offset = 0;
  return (
    <>
      <clipPath id={clipId}>
        <rect y={y} width={width} height={height} rx={height / 2} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect y={y} width={width} height={height} fill={tokens.ink} fillOpacity={0.1} />
        {total > 0 &&
          segments.map((segment) => {
            const segmentWidth = (Math.max(segment.value, 0) / total) * width;
            const x = offset;
            offset += segmentWidth;
            return (
              <rect
                key={segment.key}
                x={x}
                y={y}
                width={segmentWidth}
                height={height}
                fill={segment.fill}
                fillOpacity={segment.opacity ?? 1}
              />
            );
          })}
      </g>
    </>
  );
};

export const Avatar = ({
  id,
  x,
  y,
  size,
  href,
  tokens,
}: {
  id: string;
  x: number;
  y: number;
  size: number;
  href: string | null;
  tokens: PaletteTokens;
}) => {
  const clipId = `avatar-${safeId(id)}`;
  const radius = Math.round(size * 0.3);
  return (
    <>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={radius}
        fill={tokens.accent}
        fillOpacity={0.22}
      />
      {href && (
        <>
          <clipPath id={clipId}>
            <rect x={x} y={y} width={size} height={size} rx={radius} />
          </clipPath>
          <image
            href={href}
            x={x}
            y={y}
            width={size}
            height={size}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        </>
      )}
    </>
  );
};

/** Greedy word wrap by estimated width; overflowing last line gets an ellipsis. */
export const wrapText = (
  text: string,
  width: number,
  size: number,
  { weight = 500, letterSpacing = 0, maxLines = Infinity } = {},
) => {
  const measure = (value: string) => estimateTextWidth(value, size, { weight, letterSpacing });
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && measure(next) > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fitText(`${kept[maxLines - 1]} ${lines[maxLines]}`, width, size, weight);
  return kept;
};
