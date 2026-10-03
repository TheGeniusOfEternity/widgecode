import type { BlockRenderer } from './context.js';
import { BLOCK_LINE_HEIGHT } from '../geometry.js';
import { difficultyColors } from '../theme.js';
import {
  StatsRow,
  SvgText,
  TitleRow,
  asNumber,
  asRecord,
  asString,
  baseline,
  fitText,
  formatNumber,
  statsRowHeight,
  type StatItem,
} from '../svgPrimitives.js';
import { BigStat, SegmentBar, bigStatHeight } from './parts.js';

const solvedOf = (data: Record<string, unknown>) => asRecord(data.solved);

const difficultySegments = (solved: Record<string, unknown>) => [
  { key: 'easy', value: asNumber(solved.easy), fill: difficultyColors.easy },
  { key: 'medium', value: asNumber(solved.medium), fill: difficultyColors.medium },
  { key: 'hard', value: asNumber(solved.hard), fill: difficultyColors.hard },
];

// 1×1: solved count with the difficulty mix.
const tiny: BlockRenderer = ({ block, data, labels, frame, tokens }) => {
  const solved = solvedOf(data);
  const statHeight = bigStatHeight(26, 10);
  return (
    <>
      <BigStat
        x={frame.width / 2}
        top={Math.max((frame.height - statHeight - 14) / 2, 0)}
        width={frame.width}
        value={solved.all}
        label={labels.solved}
        tokens={tokens}
        maxSize={26}
        labelSize={10}
        anchor="middle"
      />
      <SegmentBar
        id={block.id}
        y={frame.height - 6}
        width={frame.width}
        height={6}
        segments={difficultySegments(solved)}
        tokens={tokens}
      />
    </>
  );
};

// 2×1 and 4×1: title, stats and the difficulty bar.
const strips: BlockRenderer = ({
  block,
  config,
  data,
  labels,
  t,
  frame,
  tokens,
  username,
  variant,
}) => {
  const solved = solvedOf(data);
  const items: StatItem[] = [
    { label: labels.solved, value: solved.all },
    ...(config.showRanking !== false ? [{ label: labels.ranking, value: data.ranking }] : []),
    ...(variant === 'wide' && config.showContestRating !== false
      ? [{ label: labels.contestRating, value: data.contestRating }]
      : []),
  ];
  return (
    <>
      <TitleRow
        title={labels.leetcodeProfile}
        meta={`@${asString(data.username, username || 'username')}`}
        frame={frame}
        tokens={tokens}
      />
      <StatsRow
        top={t.heading * BLOCK_LINE_HEIGHT + 8}
        items={items}
        frame={frame}
        tokens={tokens}
      />
      <SegmentBar
        id={block.id}
        y={frame.height - 6}
        width={frame.width}
        height={6}
        segments={difficultySegments(solved)}
        tokens={tokens}
      />
    </>
  );
};

// 4×2: title, stats and one bar per difficulty.
const large: BlockRenderer = ({ block, config, data, labels, t, frame, tokens, username }) => {
  const solved = solvedOf(data);
  const total = Math.max(asNumber(solved.all), 1);
  const items: StatItem[] = [
    { label: labels.solved, value: solved.all },
    ...(config.showRanking !== false ? [{ label: labels.ranking, value: data.ranking }] : []),
    ...(config.showContestRating !== false
      ? [{ label: labels.contestRating, value: data.contestRating }]
      : []),
  ];
  const statsTop = t.heading * BLOCK_LINE_HEIGHT + t.sectionGap;
  const rowsTop = statsTop + statsRowHeight(t) + t.sectionGap;
  const rowHeight = t.meta * BLOCK_LINE_HEIGHT + 4 + 6;
  const rowGap = Math.max((frame.height - rowsTop - rowHeight * 3) / 2, 4);
  const rows = [
    { key: 'easy', label: labels.easy, value: asNumber(solved.easy), color: difficultyColors.easy },
    {
      key: 'medium',
      label: labels.medium,
      value: asNumber(solved.medium),
      color: difficultyColors.medium,
    },
    { key: 'hard', label: labels.hard, value: asNumber(solved.hard), color: difficultyColors.hard },
  ];
  return (
    <>
      <TitleRow
        title={labels.leetcodeProfile}
        meta={`@${asString(data.username, username || 'username')}`}
        frame={frame}
        tokens={tokens}
      />
      <StatsRow top={statsTop} items={items} frame={frame} tokens={tokens} />
      {rows.map((row, index) => {
        const top = rowsTop + index * (rowHeight + rowGap);
        return (
          <g key={row.key}>
            <SvgText
              x={0}
              y={baseline(top, t.meta)}
              value={row.label}
              fill={tokens.ink}
              size={t.meta}
              opacity={0.7}
            />
            <SvgText
              x={frame.width}
              y={baseline(top, t.meta)}
              value={formatNumber(row.value, '0')}
              fill={tokens.ink}
              size={t.meta}
              weight={700}
              anchor="end"
            />
            <SegmentBar
              id={`${block.id}-${row.key}`}
              y={top + t.meta * BLOCK_LINE_HEIGHT + 4}
              width={frame.width}
              height={6}
              segments={[
                { key: row.key, value: row.value, fill: row.color },
                { key: 'rest', value: total - row.value, fill: 'transparent', opacity: 0 },
              ]}
              tokens={tokens}
            />
          </g>
        );
      })}
    </>
  );
};

const card: BlockRenderer = ({ config, data, labels, t, frame, tokens, username }) => {
  const solved = asRecord(data.solved);
  const stats = [
    { label: labels.solved, value: solved.all },
    config.showRanking !== false ? { label: labels.ranking, value: data.ranking } : null,
    config.showContestRating !== false
      ? { label: labels.contestRating, value: data.contestRating }
      : null,
  ].filter((item): item is StatItem => item !== null);
  const statsTop = t.heading * BLOCK_LINE_HEIGHT + t.sectionGap;
  const difficultyTop = statsTop + statsRowHeight(t) + t.sectionGap;
  const difficultyWidth = (frame.width - t.columnGap * 2) / 3;
  const difficulty = [
    { label: labels.easy, value: solved.easy, color: difficultyColors.easy },
    { label: labels.medium, value: solved.medium, color: difficultyColors.medium },
    { label: labels.hard, value: solved.hard, color: difficultyColors.hard },
  ];
  return (
    <>
      <TitleRow
        title={labels.leetcodeProfile}
        meta={`@${asString(data.username, username || 'username')}`}
        frame={frame}
        tokens={tokens}
      />
      <StatsRow top={statsTop} items={stats} frame={frame} tokens={tokens} />
      {difficulty.map((item, index) => {
        const x = index * (difficultyWidth + t.columnGap);
        return (
          <g key={item.label}>
            <circle
              cx={x + 3.5}
              cy={difficultyTop + (t.meta * BLOCK_LINE_HEIGHT) / 2}
              r={3.5}
              fill={item.color}
            />
            <SvgText
              x={x + 13}
              y={baseline(difficultyTop, t.meta)}
              value={fitText(
                `${item.label} ${formatNumber(item.value, '0')}`,
                difficultyWidth - 13,
                t.meta,
              )}
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

export const renderLeetcode: BlockRenderer = (context) => {
  if (context.variant === 'tiny') return tiny(context);
  if (context.variant === 'strip' || context.variant === 'wide') return strips(context);
  if (context.variant === 'large') return large(context);
  return card(context);
};
