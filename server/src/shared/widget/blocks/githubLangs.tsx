import type { BlockRenderer } from './context.js';
import { BLOCK_LINE_HEIGHT, estimateTextWidth } from '../geometry.js';
import { languageColor } from '../theme.js';
import { SvgText, TitleRow, asRecord, baseline, fitText, safeId } from '../svgPrimitives.js';
import { SegmentBar, fitFontSize } from './parts.js';

type Language = { name: string; percentage: number };

const languagesOf = (data: Record<string, unknown>): Language[] =>
  Array.isArray(data.languages)
    ? data.languages.filter((item): item is Language => {
        const value = asRecord(item);
        return typeof value.name === 'string' && typeof value.percentage === 'number';
      })
    : [];

const languageSegments = (languages: Language[]) =>
  languages.map((language) => ({
    key: language.name,
    value: language.percentage,
    fill: languageColor(language.name),
  }));

// 1×1: the top language and its share, with the full mix as a thin bar.
const tiny: BlockRenderer = ({ block, data, labels, frame, tokens }) => {
  const languages = languagesOf(data);
  const top = languages[0];
  const percent = `${top?.percentage ?? 0}%`;
  const size = fitFontSize(percent, frame.width, { max: 30, min: 14, letterSpacing: -0.06 });
  return (
    <>
      <SvgText
        x={0}
        y={baseline(0, 10)}
        value={labels.languages}
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
      {top && (
        <>
          <circle
            cx={3.5}
            cy={18 + size * BLOCK_LINE_HEIGHT + 8}
            r={3.5}
            fill={languageColor(top.name)}
          />
          <SvgText
            x={12}
            y={baseline(18 + size * BLOCK_LINE_HEIGHT + 2, 11)}
            value={fitText(top.name, frame.width - 12, 11, 700)}
            fill={tokens.ink}
            size={11}
            weight={700}
          />
        </>
      )}
      <SegmentBar
        id={block.id}
        y={frame.height - 6}
        width={frame.width}
        height={6}
        segments={languageSegments(languages)}
        tokens={tokens}
      />
    </>
  );
};

// 2×1 and 4×1: title, bar and one row of legend (2 or 4 languages).
const legendStrip: BlockRenderer = ({ block, data, labels, t, frame, tokens, variant }) => {
  const languages = languagesOf(data);
  const shown = languages.slice(0, variant === 'wide' ? 4 : 2);
  const barY = t.heading * BLOCK_LINE_HEIGHT + 10;
  const legendTop = barY + 10 + 10;
  const columnWidth = (frame.width - t.columnGap * (shown.length - 1)) / Math.max(shown.length, 1);
  return (
    <>
      <TitleRow
        title={labels.languages}
        meta={`${labels.top} ${languages.length}`}
        frame={frame}
        tokens={tokens}
      />
      <SegmentBar
        id={block.id}
        y={barY}
        width={frame.width}
        height={10}
        segments={languageSegments(languages)}
        tokens={tokens}
      />
      {shown.map((language, index) => {
        const x = index * (columnWidth + t.columnGap);
        const percent = `${language.percentage}%`;
        const percentWidth = estimateTextWidth(percent, t.meta, { weight: 700 });
        return (
          <g key={language.name}>
            <circle
              cx={x + 3.5}
              cy={legendTop + (t.meta * BLOCK_LINE_HEIGHT) / 2}
              r={3.5}
              fill={languageColor(language.name)}
            />
            <SvgText
              x={x + 11}
              y={baseline(legendTop, t.meta)}
              value={fitText(language.name, columnWidth - 11 - percentWidth - 4, t.meta)}
              fill={tokens.ink}
              size={t.meta}
              opacity={0.6}
            />
            <SvgText
              x={x + columnWidth}
              y={baseline(legendTop, t.meta)}
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
  );
};

const card: BlockRenderer = ({ block, data, labels, t, frame, tokens }) => {
  const languages = Array.isArray(data.languages)
    ? data.languages
        .filter((item): item is { name: string; percentage: number } => {
          const value = asRecord(item);
          return typeof value.name === 'string' && typeof value.percentage === 'number';
        })
        .slice(0, 8)
    : [];
  const barY = t.heading * BLOCK_LINE_HEIGHT + t.sectionGap;
  const listTop = barY + 10 + t.sectionGap;
  const columnWidth = (frame.width - t.columnGap) / 2;
  const rowHeight = t.meta * BLOCK_LINE_HEIGHT;
  const barClipId = `bar-${safeId(block.id)}`;
  let barOffset = 0;
  return (
    <>
      <TitleRow
        title={labels.languages}
        meta={`${labels.top} ${languages.length}`}
        frame={frame}
        tokens={tokens}
      />
      <clipPath id={barClipId}>
        <rect y={barY} width={frame.width} height={10} rx={5} />
      </clipPath>
      <g clipPath={`url(#${barClipId})`}>
        <rect y={barY} width={frame.width} height={10} fill={tokens.ink} fillOpacity={0.1} />
        {languages.map((language) => {
          const segmentWidth = (Math.max(language.percentage, 0) / 100) * frame.width;
          const x = barOffset;
          barOffset += segmentWidth;
          return (
            <rect
              key={`bar-${language.name}`}
              x={x}
              y={barY}
              width={segmentWidth}
              height={10}
              fill={languageColor(language.name)}
            />
          );
        })}
      </g>
      {languages.map((language, index) => {
        const x = (index % 2) * (columnWidth + t.columnGap);
        const top = listTop + Math.floor(index / 2) * (rowHeight + t.rowGap);
        const percent = `${language.percentage}%`;
        return (
          <g key={language.name}>
            <circle
              cx={x + 3.5}
              cy={top + rowHeight / 2}
              r={3.5}
              fill={languageColor(language.name)}
            />
            <SvgText
              x={x + 13}
              y={baseline(top, t.meta)}
              value={fitText(
                language.name,
                columnWidth - 13 - estimateTextWidth(percent, t.meta, { weight: 700 }) - 6,
                t.meta,
              )}
              fill={tokens.ink}
              size={t.meta}
              opacity={0.6}
            />
            <SvgText
              x={x + columnWidth}
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
  );
};

export const renderGithubLangs: BlockRenderer = (context) => {
  if (context.variant === 'tiny') return tiny(context);
  if (context.variant === 'strip' || context.variant === 'wide') return legendStrip(context);
  return card(context);
};
