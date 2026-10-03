// Content of one widget block, drawn in the block's content box (origin at its top-left).
import {
  BLOCK_LINE_HEIGHT,
  HEATMAP_CELL,
  HEATMAP_GAP,
  TEXT_BLOCK_LINE_HEIGHT,
  estimateTextWidth,
  heatmapColumns,
  heatmapWeeks,
} from './geometry.js';
import {
  difficultyColors,
  errorColor,
  heatmapOpacity,
  languageColor,
  widgetLabels,
  type PaletteTokens,
  type WidgetLocale,
} from './theme.js';
import type { WidgetCanvasBlock, WidgetCanvasRenderedBlock } from './types.js';
import {
  MultilineText,
  PreviewState,
  StatsRow,
  SvgText,
  TitleRow,
  asNumber,
  asRecord,
  asString,
  baseline,
  clamp,
  fitText,
  formatNumber,
  imageUrl,
  linesOf,
  safeId,
  statsRowHeight,
  type BlockFrame,
  type StatItem,
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
  const labels = widgetLabels(locale);
  const { typography: t } = frame;
  const config = asRecord(block.config);
  const data = asRecord(rendered?.data);
  const source = block.type.startsWith('github')
    ? 'GitHub'
    : block.type.startsWith('leetcode')
      ? 'LeetCode'
      : null;
  const username = asString(config.username);

  if (rendered?.error) {
    return (
      <MultilineText
        x={0}
        top={0}
        lineHeight={1.5}
        lines={linesOf(rendered.error, Math.floor(frame.width / (13 * 0.52)), 4)}
        fill={errorColor}
        size={13}
      />
    );
  }

  if (block.type === 'text') {
    const align = config.align === 'center' || config.align === 'right' ? config.align : 'left';
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
    const x = align === 'center' ? frame.width / 2 : align === 'right' ? frame.width : 0;
    const maxLines = Math.max(Math.floor(frame.height / (t.text * TEXT_BLOCK_LINE_HEIGHT)), 1);
    return (
      <MultilineText
        x={x}
        top={0}
        lineHeight={TEXT_BLOCK_LINE_HEIGHT}
        lines={linesOf(
          asString(config.text, labels.defaultText),
          Math.floor(frame.width / (t.text * 0.5)),
          maxLines,
        )}
        fill={tokens.ink}
        size={t.text}
        weight={800}
        anchor={anchor}
        letterSpacing="-0.05em"
      />
    );
  }

  if (source && !username && !rendered?.data) {
    return <PreviewState source={source} frame={frame} tokens={tokens} locale={locale} />;
  }

  if (!rendered?.data) return <BlockSkeleton frame={frame} tokens={tokens} />;

  if (block.type === 'github-stats') {
    const avatarHref = avatarDataUri ?? imageUrl(data.avatarUrl);
    const avatarId = `avatar-${safeId(block.id)}`;
    const tightGap = clamp(frame.width / 100, 2, 3);
    const textColumnHeight = t.heading * BLOCK_LINE_HEIGHT + tightGap + t.meta * BLOCK_LINE_HEIGHT;
    const headingHeight = Math.max(t.avatar, textColumnHeight);
    const avatarY = (headingHeight - t.avatar) / 2;
    const textTop = (headingHeight - textColumnHeight) / 2;
    const textX = t.avatar + t.headingGap;
    const textWidth = frame.width - textX;
    const stats = [
      config.showRepositories !== false
        ? { label: labels.repositories, value: data.publicRepositories }
        : null,
      config.showFollowers !== false ? { label: labels.followers, value: data.followers } : null,
      config.showFollowing !== false ? { label: labels.following, value: data.following } : null,
    ].filter((item): item is StatItem => item !== null);
    return (
      <>
        <rect
          y={avatarY}
          width={t.avatar}
          height={t.avatar}
          rx={14}
          fill={tokens.accent}
          fillOpacity={0.22}
        />
        {avatarHref && (
          <>
            <clipPath id={avatarId}>
              <rect y={avatarY} width={t.avatar} height={t.avatar} rx={14} />
            </clipPath>
            <image
              href={avatarHref}
              y={avatarY}
              width={t.avatar}
              height={t.avatar}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${avatarId})`}
            />
          </>
        )}
        <SvgText
          x={textX}
          y={baseline(textTop, t.heading)}
          value={fitText(asString(data.name, labels.githubProfile), textWidth, t.heading, 800)}
          fill={tokens.ink}
          size={t.heading}
          weight={800}
        />
        <SvgText
          x={textX}
          y={baseline(textTop + t.heading * BLOCK_LINE_HEIGHT + tightGap, t.meta)}
          value={fitText(`@${asString(data.username, username || 'username')}`, textWidth, t.meta)}
          fill={tokens.ink}
          size={t.meta}
          opacity={0.6}
        />
        {stats.length > 0 && (
          <StatsRow
            top={headingHeight + t.sectionGap}
            items={stats}
            frame={frame}
            tokens={tokens}
          />
        )}
      </>
    );
  }

  if (block.type === 'github-langs') {
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
  }

  if (block.type === 'github-commits') {
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
    const columns = heatmapColumns(
      levels,
      heatmapWeeks(frame.width),
      asNumber(data.firstDayOfWeek),
    );
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
  }

  if (block.type === 'github-prs') {
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
  }

  if (block.type === 'github-status') {
    const emoji = asString(data.emoji);
    const message = asString(data.message);
    const top = t.heading * BLOCK_LINE_HEIGHT + t.sectionGap;
    const messageTop = emoji ? top + t.text * BLOCK_LINE_HEIGHT + t.headingGap : top;
    const messageLines = message
      ? linesOf(message, Math.floor(frame.width / (t.heading * 0.55)), 3)
      : [];
    const chipTop = messageTop + messageLines.length * t.heading * BLOCK_LINE_HEIGHT + t.headingGap;
    const chipHeight = t.meta * BLOCK_LINE_HEIGHT + 8;
    return (
      <>
        <TitleRow
          title={labels.status}
          meta={`@${asString(data.username, username || 'username')}`}
          frame={frame}
          tokens={tokens}
        />
        {!emoji && !message ? (
          <SvgText
            x={0}
            y={baseline(top, t.meta)}
            value={labels.noStatus}
            fill={tokens.ink}
            size={t.meta}
            opacity={0.6}
          />
        ) : (
          <>
            {emoji && (
              <SvgText
                x={0}
                y={baseline(top, t.text)}
                value={emoji}
                fill={tokens.ink}
                size={t.text}
              />
            )}
            <MultilineText
              x={0}
              top={messageTop}
              lineHeight={BLOCK_LINE_HEIGHT}
              lines={messageLines}
              fill={tokens.ink}
              size={t.heading}
              weight={700}
            />
            {data.busy === true && (
              <g>
                <rect
                  y={chipTop}
                  width={estimateTextWidth(labels.busy, t.meta, { weight: 700 }) + 20}
                  height={chipHeight}
                  rx={chipHeight / 2}
                  fill={tokens.accent}
                  fillOpacity={0.14}
                />
                <SvgText
                  x={10}
                  y={baseline(chipTop + 4, t.meta)}
                  value={labels.busy}
                  fill={tokens.accent}
                  size={t.meta}
                  weight={700}
                />
              </g>
            )}
          </>
        )}
      </>
    );
  }

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
