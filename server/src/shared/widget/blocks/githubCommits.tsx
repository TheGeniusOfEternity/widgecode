import type { BlockRenderer } from './context.js';
import {
  BLOCK_LINE_HEIGHT,
  HEATMAP_CELL,
  HEATMAP_GAP,
  heatmapColumns,
  heatmapWeeks,
} from '../geometry.js';
import { formatStatValue, heatmapOpacity } from '../theme.js';
import {
  StatsRow,
  SvgText,
  TitleRow,
  asNumber,
  asString,
  baseline,
  clamp,
  statsRowHeight,
  type StatItem,
} from '../svgPrimitives.js';
import { BigStat, bigStatHeight } from './parts.js';

// 1×1: commits this year and the current streak.
const tiny: BlockRenderer = ({ data, labels, frame, tokens }) => {
  const statHeight = bigStatHeight(26, 10);
  const top = Math.max((frame.height - statHeight - 18) / 2, 0);
  return (
    <>
      <BigStat
        x={frame.width / 2}
        top={top}
        width={frame.width}
        value={data.commitsYear}
        label={labels.commits}
        tokens={tokens}
        maxSize={26}
        labelSize={10}
        anchor="middle"
      />
      <SvgText
        x={frame.width / 2}
        y={baseline(top + statHeight + 4, 11)}
        value={`🔥 ${formatStatValue(data.currentStreak)}`}
        fill={tokens.ink}
        size={11}
        weight={700}
        anchor="middle"
      />
    </>
  );
};

// 2×1: title with commits and current streak.
const strip: BlockRenderer = ({ data, labels, t, frame, tokens, username }) => (
  <>
    <TitleRow
      title={labels.activity}
      meta={`@${asString(data.username, username || 'username')}`}
      frame={frame}
      tokens={tokens}
    />
    <StatsRow
      top={t.heading * BLOCK_LINE_HEIGHT + 10}
      items={[
        { label: labels.commits, value: data.commitsYear },
        { label: labels.currentStreak, value: data.currentStreak },
      ]}
      frame={frame}
      tokens={tokens}
    />
  </>
);

// 4×1: caption and a compact heatmap filling the rest of the strip.
const wide: BlockRenderer = ({ data, labels, t, frame, tokens, username }) => {
  const gap = 2;
  const top = t.heading * BLOCK_LINE_HEIGHT + 8;
  const cell = Math.max(Math.floor((frame.height - top - gap * 6) / 7), 4);
  const levels = Array.isArray(data.levels)
    ? data.levels.filter((level): level is number => typeof level === 'number')
    : [];
  const weeks = clamp(Math.floor((frame.width + gap) / (cell + gap)), 4, 53);
  const columns = heatmapColumns(levels, weeks, asNumber(data.firstDayOfWeek));
  return (
    <>
      <TitleRow
        title={labels.activity}
        meta={`${formatStatValue(data.commitsYear)} · @${asString(data.username, username || 'username')}`}
        frame={frame}
        tokens={tokens}
      />
      {columns.map((column, week) =>
        column.map((level, weekday) =>
          level === null ? null : (
            <rect
              key={`${week}-${weekday}`}
              x={week * (cell + gap)}
              y={top + weekday * (cell + gap)}
              width={cell}
              height={cell}
              rx={2}
              fill={level === 0 ? tokens.ink : tokens.accent}
              fillOpacity={heatmapOpacity[level] ?? heatmapOpacity[0]}
            />
          ),
        ),
      )}
    </>
  );
};

const card: BlockRenderer = ({ config, data, labels, t, frame, tokens, username }) => {
  const stats: StatItem[] = [
    { label: labels.commits, value: data.commitsYear },
    ...(config.showStreak !== false
      ? [
          { label: labels.currentStreak, value: data.currentStreak },
          { label: labels.longestStreak, value: data.longestStreak },
        ]
      : []),
  ];
  const statsTop = t.heading * BLOCK_LINE_HEIGHT + t.sectionGap;
  const heatmapTop = statsTop + statsRowHeight(t) + t.sectionGap;
  const levels = Array.isArray(data.levels)
    ? data.levels.filter((level): level is number => typeof level === 'number')
    : [];
  const columns = heatmapColumns(levels, heatmapWeeks(frame.width), asNumber(data.firstDayOfWeek));
  return (
    <>
      <TitleRow
        title={labels.activity}
        meta={`@${asString(data.username, username || 'username')}`}
        frame={frame}
        tokens={tokens}
      />
      <StatsRow top={statsTop} items={stats} frame={frame} tokens={tokens} />
      {config.showHeatmap !== false &&
        columns.map((column, week) =>
          column.map((level, weekday) =>
            level === null ? null : (
              <rect
                key={`${week}-${weekday}`}
                x={week * (HEATMAP_CELL + HEATMAP_GAP)}
                y={heatmapTop + weekday * (HEATMAP_CELL + HEATMAP_GAP)}
                width={HEATMAP_CELL}
                height={HEATMAP_CELL}
                rx={2.5}
                fill={level === 0 ? tokens.ink : tokens.accent}
                fillOpacity={heatmapOpacity[level] ?? heatmapOpacity[0]}
              />
            ),
          ),
        )}
    </>
  );
};

export const renderGithubCommits: BlockRenderer = (context) => {
  if (context.variant === 'tiny') return tiny(context);
  if (context.variant === 'strip') return strip(context);
  if (context.variant === 'wide') return wide(context);
  return card(context);
};
