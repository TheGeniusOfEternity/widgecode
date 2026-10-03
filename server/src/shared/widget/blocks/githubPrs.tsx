import type { BlockRenderer } from './context.js';
import { BLOCK_LINE_HEIGHT, estimateTextWidth } from '../geometry.js';
import {
  StatsRow,
  SvgText,
  TitleRow,
  asNumber,
  asString,
  baseline,
  fitText,
  safeId,
  statsRowHeight,
  type StatItem,
} from '../svgPrimitives.js';
import { SegmentBar, fitFontSize } from './parts.js';

const prSegments = (data: Record<string, unknown>, tokens: { accent: string; ink: string }) => [
  { key: 'merged', value: asNumber(data.merged), fill: tokens.accent },
  { key: 'open', value: asNumber(data.open), fill: tokens.accent, opacity: 0.45 },
  { key: 'closed', value: asNumber(data.closed), fill: tokens.ink, opacity: 0.2 },
];

// 1×1: share of merged pull requests.
const tiny: BlockRenderer = ({ block, data, labels, frame, tokens }) => {
  const total = asNumber(data.total);
  const percent = `${total > 0 ? Math.round((asNumber(data.merged) / total) * 100) : 0}%`;
  const size = fitFontSize(percent, frame.width, { max: 30, min: 14, letterSpacing: -0.06 });
  return (
    <>
      <SvgText
        x={0}
        y={baseline(0, 10)}
        value={labels.pullRequests}
        fill={tokens.ink}
        size={10}
        opacity={0.6}
      />
      <SvgText
        x={0}
        y={baseline(18, size)}
        value={percent}
        fill={tokens.ink}
        size={size}
        weight={800}
        letterSpacing="-0.06em"
      />
      <SvgText
        x={0}
        y={baseline(18 + size * BLOCK_LINE_HEIGHT + 2, 11)}
        value={fitText(labels.merged, frame.width, 11, 700)}
        fill={tokens.ink}
        size={11}
        weight={700}
        opacity={0.8}
      />
      <SegmentBar
        id={block.id}
        y={frame.height - 6}
        width={frame.width}
        height={6}
        segments={prSegments(data, tokens)}
        tokens={tokens}
      />
    </>
  );
};

// 2×1 and 4×1: title and stats (4×1 adds closed and the breakdown bar).
const strips: BlockRenderer = ({ block, data, labels, t, frame, tokens, username, variant }) => {
  const statsTop = t.heading * BLOCK_LINE_HEIGHT + 8;
  const items: StatItem[] = [
    { label: labels.total, value: data.total },
    { label: labels.merged, value: data.merged },
    { label: labels.open, value: data.open },
    ...(variant === 'wide' ? [{ label: labels.closed, value: data.closed }] : []),
  ];
  return (
    <>
      <TitleRow
        title={labels.pullRequests}
        meta={`@${asString(data.username, username || 'username')}`}
        frame={frame}
        tokens={tokens}
      />
      <StatsRow top={statsTop} items={items} frame={frame} tokens={tokens} />
      {variant === 'wide' && (
        <SegmentBar
          id={block.id}
          y={frame.height - 6}
          width={frame.width}
          height={6}
          segments={prSegments(data, tokens)}
          tokens={tokens}
        />
      )}
    </>
  );
};

const card: BlockRenderer = ({ block, config, data, labels, t, frame, tokens, username }) => {
  const total = asNumber(data.total);
  const parts = [
    { label: labels.merged, value: asNumber(data.merged), fill: tokens.accent, opacity: 1 },
    { label: labels.open, value: asNumber(data.open), fill: tokens.accent, opacity: 0.45 },
    { label: labels.closed, value: asNumber(data.closed), fill: tokens.ink, opacity: 0.2 },
  ];
  const statsTop = t.heading * BLOCK_LINE_HEIGHT + t.sectionGap;
  const barY = statsTop + statsRowHeight(t) + t.sectionGap;
  const legendTop = barY + 10 + t.sectionGap;
  const legendWidth = (frame.width - t.columnGap) / 2;
  const legendRowHeight = t.meta * BLOCK_LINE_HEIGHT;
  const barClipId = `prs-${safeId(block.id)}`;
  let barOffset = 0;
  return (
    <>
      <TitleRow
        title={labels.pullRequests}
        meta={`@${asString(data.username, username || 'username')}`}
        frame={frame}
        tokens={tokens}
      />
      <StatsRow
        top={statsTop}
        items={[
          { label: labels.total, value: data.total },
          { label: labels.merged, value: data.merged },
          { label: labels.open, value: data.open },
        ]}
        frame={frame}
        tokens={tokens}
      />
      {config.showBreakdown !== false && (
        <>
          <clipPath id={barClipId}>
            <rect y={barY} width={frame.width} height={10} rx={5} />
          </clipPath>
          <g clipPath={`url(#${barClipId})`}>
            <rect y={barY} width={frame.width} height={10} fill={tokens.ink} fillOpacity={0.1} />
            {total > 0 &&
              parts.map((part) => {
                const width = (part.value / total) * frame.width;
                const x = barOffset;
                barOffset += width;
                return (
                  <rect
                    key={part.label}
                    x={x}
                    y={barY}
                    width={width}
                    height={10}
                    fill={part.fill}
                    fillOpacity={part.opacity}
                  />
                );
              })}
          </g>
          {parts.map((part, index) => {
            // Same two-column list as the languages block: label left, percent right.
            const x = (index % 2) * (legendWidth + t.columnGap);
            const top = legendTop + Math.floor(index / 2) * (legendRowHeight + t.rowGap);
            const percent = `${total > 0 ? Math.round((part.value / total) * 100) : 0}%`;
            return (
              <g key={part.label}>
                <circle
                  cx={x + 3.5}
                  cy={top + legendRowHeight / 2}
                  r={3.5}
                  fill={part.fill}
                  fillOpacity={part.opacity}
                />
                <SvgText
                  x={x + 13}
                  y={baseline(top, t.meta)}
                  value={fitText(
                    part.label,
                    legendWidth - 13 - estimateTextWidth(percent, t.meta, { weight: 700 }) - 6,
                    t.meta,
                  )}
                  fill={tokens.ink}
                  size={t.meta}
                  opacity={0.6}
                />
                <SvgText
                  x={x + legendWidth}
                  y={baseline(top, t.meta)}
                  value={percent}
                  fill={tokens.ink}
                  size={t.meta}
                  weight={700}
                  anchor="end"
                />
              </g>
            );
          })}
        </>
      )}
    </>
  );
};

export const renderGithubPrs: BlockRenderer = (context) => {
  if (context.variant === 'tiny') return tiny(context);
  if (context.variant === 'strip' || context.variant === 'wide') return strips(context);
  return card(context);
};
