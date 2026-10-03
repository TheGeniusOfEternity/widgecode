import type { CSSProperties, MouseEvent } from 'react';

import type {
  BlockLayout,
  BlockType,
  PaletteId,
  PaletteMode,
  RenderedBlock,
  WidgetBlock,
} from '@/entities/widget/model';
import {
  blockMetrics,
  blockStyleVars,
  canvasStyleVars,
  getBlockLayout,
} from '@/entities/widget/lib/canvasStyle';
import {
  MAX_GRID_COLUMNS,
  WIDGET_WIDTH,
  gridRows,
  heatmapColumns,
  heatmapWeeks,
  widgetDimensions,
} from '@shared/widget/geometry';
import { formatStatValue, heatmapOpacity, languageColor, widgetLabels } from '@shared/widget/theme';
import styles from '@/entities/widget/ui/WidgetCanvas.module.css';

type WidgetLocale = 'ru' | 'en';

type WidgetCanvasProps = {
  blocks: WidgetBlock[];
  palette: PaletteId;
  paletteMode?: PaletteMode;
  columns?: number;
  width?: number;
  height?: number;
  renderedBlocks?: RenderedBlock[];
  interactive?: boolean;
  selectedBlockId?: string;
  onSelectBlock?: (id: string) => void;
  locale?: WidgetLocale;
};

const sampleData: Record<BlockType, Record<string, unknown>> = {
  text: {},
  'github-stats': {
    username: 'octocat',
    name: 'The Octocat',
    publicRepositories: 42,
    followers: 4_321,
    following: 12,
  },
  'github-langs': {
    languages: [
      { name: 'TypeScript', percentage: 54 },
      { name: 'JavaScript', percentage: 24 },
      { name: 'CSS', percentage: 14 },
      { name: 'Other', percentage: 8 },
    ],
  },
  'github-commits': {
    username: 'octocat',
    commitsYear: 1_284,
    currentStreak: 12,
    longestStreak: 47,
    levels: Array.from({ length: 364 }, (_, day) => [0, 1, 2, 1, 3, 0, 4, 2, 1][(day * 7) % 9]),
    firstDayOfWeek: 0,
  },
  'github-prs': { username: 'octocat', total: 214, merged: 176, open: 6, closed: 32 },
  'github-status': {
    username: 'octocat',
    emoji: '🚀',
    message: 'Shipping new widgets',
    busy: false,
  },
  'leetcode-stats': {
    username: 'your-profile',
    ranking: 18_240,
    contestRating: 1_726,
    solved: { all: 312, easy: 148, medium: 132, hard: 32 },
  },
};

const renderedData = (block: WidgetBlock, renderedBlocks?: RenderedBlock[]) =>
  renderedBlocks?.find((rendered) => rendered.id === block.id);

const PreviewState = ({
  locale,
  source,
}: {
  locale: WidgetLocale;
  source: 'GitHub' | 'LeetCode';
}) => {
  const labels = widgetLabels(locale);
  return (
    <div className={styles.previewState} role="status">
      <span className={styles.previewStateMark} aria-hidden="true">
        @
      </span>
      <span className={styles.previewStateCopy}>
        <strong>{labels.addUsername}</strong>
        <span>{labels.addUsernameHint(source)}</span>
      </span>
    </div>
  );
};

const WidgetBlockSkeleton = () => (
  <div className={styles.blockSkeleton} aria-hidden="true">
    <span className={`${styles.skeletonLine} ${styles.skeletonLineWide}`} />
    <span className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
    <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
    <div className={styles.skeletonStats}>
      <span className={styles.skeletonStat} />
      <span className={styles.skeletonStat} />
      <span className={styles.skeletonStat} />
    </div>
  </div>
);

const numberFormatter = new Intl.NumberFormat('en-US');

const formatNumber = (value: unknown, fallback = '—') =>
  typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : fallback;

type BlockData = {
  commitsYear?: number;
  currentStreak?: number;
  longestStreak?: number;
  levels?: number[];
  firstDayOfWeek?: number;
  total?: number;
  merged?: number;
  open?: number;
  closed?: number;
  emoji?: string | null;
  message?: string | null;
  busy?: boolean;
  username?: string;
  name?: string;
  avatarUrl?: string;
  publicRepositories?: number;
  followers?: number;
  following?: number;
  ranking?: number | null;
  contestRating?: number | null;
  solved?: { all?: number; easy?: number; medium?: number; hard?: number };
  languages?: { name: string; percentage: number }[];
};

type StatItem = { label: string; value: unknown };

const StatsRow = ({ items, block }: { items: StatItem[]; block: WidgetBlock }) => {
  const { contentWidth, typography: t } = blockMetrics(getBlockLayout(block));
  const columnWidth = (contentWidth - t.columnGap * (items.length - 1)) / Math.max(items.length, 1);
  return (
    <div className={styles.statsRow} style={{ '--stat-count': items.length } as CSSProperties}>
      {items.map((item) => (
        <div className={styles.stat} key={item.label}>
          <strong>{formatStatValue(item.value, columnWidth, t.statValue)}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export const WidgetBlockContent = ({
  block,
  rendered,
  locale = 'en',
}: {
  block: WidgetBlock;
  rendered?: RenderedBlock;
  locale?: WidgetLocale;
}) => {
  const labels = widgetLabels(locale);
  if (rendered?.error) return <p className={styles.error}>{rendered.error}</p>;
  const source = block.type.startsWith('github')
    ? 'GitHub'
    : block.type.startsWith('leetcode')
      ? 'LeetCode'
      : null;
  const username = typeof block.config.username === 'string' ? block.config.username.trim() : '';
  if (source && rendered?.data === undefined && !username) {
    return <PreviewState locale={locale} source={source} />;
  }
  if (source && rendered?.data === undefined && !rendered) {
    return <WidgetBlockSkeleton />;
  }
  const data = (rendered?.data as BlockData | undefined) ?? (sampleData[block.type] as BlockData);

  if (block.type === 'text') {
    const align =
      block.config.align === 'center' || block.config.align === 'right'
        ? block.config.align
        : 'left';
    const text = typeof block.config.text === 'string' ? block.config.text.trim() : '';
    return (
      <p className={styles.textBlock} style={{ textAlign: align }}>
        {text || labels.defaultText}
      </p>
    );
  }

  if (block.type === 'github-stats') {
    const stats = [
      block.config.showRepositories !== false
        ? { label: labels.repositories, value: data.publicRepositories }
        : null,
      block.config.showFollowers !== false
        ? { label: labels.followers, value: data.followers }
        : null,
      block.config.showFollowing !== false
        ? { label: labels.following, value: data.following }
        : null,
    ].filter((item) => item !== null);
    return (
      <div className={styles.statsBlock}>
        <div className={styles.blockHeading}>
          <div className={styles.avatar} aria-hidden="true">
            {data.avatarUrl && <img src={data.avatarUrl} alt="" />}
          </div>
          <div>
            <strong>{data.name || labels.githubProfile}</strong>
            <span>@{data.username || username || 'username'}</span>
          </div>
        </div>
        {stats.length > 0 && <StatsRow items={stats} block={block} />}
      </div>
    );
  }

  if (block.type === 'github-langs') {
    const languages = (data.languages ?? []).slice(0, 8);
    return (
      <div className={styles.statsBlock}>
        <div className={styles.blockTitleRow}>
          <strong>{labels.languages}</strong>
          <span>
            {labels.top} {languages.length}
          </span>
        </div>
        <div className={styles.languageBar}>
          {languages.map((language) => (
            <span
              key={language.name}
              style={{
                width: `${Math.max(language.percentage, 0)}%`,
                background: languageColor(language.name),
              }}
            />
          ))}
        </div>
        <div className={styles.languageList}>
          {languages.map((language) => (
            <span key={language.name}>
              <i style={{ background: languageColor(language.name) }} />
              <span>{language.name}</span>
              <b>{language.percentage}%</b>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === 'github-commits') {
    const stats = [
      { label: labels.commits, value: data.commitsYear },
      ...(block.config.showStreak !== false
        ? [
            { label: labels.currentStreak, value: data.currentStreak },
            { label: labels.longestStreak, value: data.longestStreak },
          ]
        : []),
    ];
    const columns = heatmapColumns(
      data.levels ?? [],
      heatmapWeeks(blockMetrics(getBlockLayout(block)).contentWidth),
      data.firstDayOfWeek ?? 0,
    );
    return (
      <div className={styles.statsBlock}>
        <div className={styles.blockTitleRow}>
          <strong>{labels.activity}</strong>
          <span>@{data.username || username || 'username'}</span>
        </div>
        <StatsRow items={stats} block={block} />
        {block.config.showHeatmap !== false && (
          <div className={styles.heatmap} aria-hidden="true">
            {columns.map((column, week) => (
              <span key={week}>
                {column.map((level, weekday) => (
                  <i
                    key={weekday}
                    data-level={level ?? undefined}
                    style={
                      level === null
                        ? { visibility: 'hidden' }
                        : { opacity: heatmapOpacity[level] ?? heatmapOpacity[0] }
                    }
                  />
                ))}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'github-prs') {
    const total = data.total ?? 0;
    const parts = [
      { key: 'merged', label: labels.merged, value: data.merged ?? 0 },
      { key: 'open', label: labels.open, value: data.open ?? 0 },
      { key: 'closed', label: labels.closed, value: data.closed ?? 0 },
    ];
    return (
      <div className={styles.statsBlock}>
        <div className={styles.blockTitleRow}>
          <strong>{labels.pullRequests}</strong>
          <span>@{data.username || username || 'username'}</span>
        </div>
        <StatsRow
          items={[
            { label: labels.total, value: data.total },
            { label: labels.merged, value: data.merged },
            { label: labels.open, value: data.open },
          ]}
          block={block}
        />
        {block.config.showBreakdown !== false && (
          <>
            <div className={styles.languageBar}>
              {total > 0 &&
                parts.map((part) => (
                  <span
                    key={part.key}
                    className={styles[`pr-${part.key}`]}
                    style={{ width: `${(part.value / total) * 100}%` }}
                  />
                ))}
            </div>
            <div className={styles.languageList}>
              {parts.map((part) => (
                <span key={part.key}>
                  <i className={styles[`pr-${part.key}`]} />
                  <span>{part.label}</span>
                  <b>{total > 0 ? Math.round((part.value / total) * 100) : 0}%</b>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (block.type === 'github-status') {
    return (
      <div className={styles.statsBlock}>
        <div className={styles.blockTitleRow}>
          <strong>{labels.status}</strong>
          <span>@{data.username || username || 'username'}</span>
        </div>
        {!data.emoji && !data.message ? (
          <span className={styles.statusEmpty}>{labels.noStatus}</span>
        ) : (
          <div className={styles.status}>
            {data.emoji && <span className={styles.statusEmoji}>{data.emoji}</span>}
            {data.message && <p className={styles.statusMessage}>{data.message}</p>}
            {data.busy && <span className={styles.statusBusy}>{labels.busy}</span>}
          </div>
        )}
      </div>
    );
  }

  const solved = data.solved ?? {};
  const stats = [
    { label: labels.solved, value: solved.all },
    block.config.showRanking !== false ? { label: labels.ranking, value: data.ranking } : null,
    block.config.showContestRating !== false
      ? { label: labels.contestRating, value: data.contestRating }
      : null,
  ].filter((item) => item !== null);
  return (
    <div className={styles.statsBlock}>
      <div className={styles.blockTitleRow}>
        <strong>{labels.leetcodeProfile}</strong>
        <span>@{data.username || username || 'username'}</span>
      </div>
      <StatsRow items={stats} block={block} />
      <div className={styles.difficultyRow}>
        <span>
          <i className={styles.easy} /> {labels.easy} {formatNumber(solved.easy, '0')}
        </span>
        <span>
          <i className={styles.medium} /> {labels.medium} {formatNumber(solved.medium, '0')}
        </span>
        <span>
          <i className={styles.hard} /> {labels.hard} {formatNumber(solved.hard, '0')}
        </span>
      </div>
    </div>
  );
};

type WidgetCanvasSkeletonProps = {
  locale?: WidgetLocale;
  width?: number;
  height?: number;
};

const skeletonLayouts: BlockLayout[] = [
  { x: 0, y: 0, width: 1, height: 1 },
  { x: 1, y: 0, width: 1, height: 1 },
];

export const WidgetCanvasSkeleton = ({
  locale = 'en',
  width = WIDGET_WIDTH,
  height = widgetDimensions(skeletonLayouts).height,
}: WidgetCanvasSkeletonProps) => (
  <div
    className={`${styles.canvas} ${styles.canvasSkeleton}`}
    style={canvasStyleVars('lavender', { width, height })}
    role="status"
    aria-label={locale === 'ru' ? 'Загрузка виджета' : 'Loading widget'}
  >
    <div className={styles.blocks} aria-hidden="true">
      {skeletonLayouts.map((layout) => (
        <article
          className={`${styles.block} ${styles.skeletonBlock}`}
          key={`${layout.x}:${layout.y}`}
          style={blockStyleVars(layout, width)}
        >
          <WidgetBlockSkeleton />
        </article>
      ))}
    </div>
  </div>
);

/**
 * HTML widget renderer used by the editor, the public page and the iframe embed. It always
 * renders at the stored widget size; wrap it in `ScaledWidgetFrame` to fit smaller containers.
 * Geometry must stay in sync with the SVG export in `@shared/widget/WidgetCanvas`.
 */
export const WidgetCanvas = ({
  blocks,
  palette,
  paletteMode = 'light',
  columns = MAX_GRID_COLUMNS,
  width = WIDGET_WIDTH,
  height,
  renderedBlocks,
  interactive = false,
  selectedBlockId,
  onSelectBlock,
  locale = 'en',
}: WidgetCanvasProps) => {
  const gridColumns = Math.max(1, Math.min(columns, MAX_GRID_COLUMNS));
  const layouts = blocks.map(getBlockLayout);
  const canvasHeight = height ?? widgetDimensions(layouts, width).height;
  const style = {
    ...canvasStyleVars(palette, { width, height: canvasHeight }),
    '--widget-columns': gridColumns,
    '--widget-rows': gridRows(layouts),
  } as CSSProperties;

  const handleSelect = (event: MouseEvent<HTMLElement>, id: string) => {
    if (!interactive || !onSelectBlock) return;
    event.stopPropagation();
    onSelectBlock(id);
  };

  return (
    <div
      className={styles.canvas}
      style={style}
      data-palette-mode={paletteMode}
      data-interactive={interactive}
    >
      {blocks.length === 0 ? (
        <p className={styles.empty}>{widgetLabels(locale).empty}</p>
      ) : (
        <div className={styles.blocks}>
          {blocks.map((block, index) => (
            <article
              className={`${styles.block} ${selectedBlockId === block.id ? styles.selected : ''}`}
              key={block.id}
              style={blockStyleVars(layouts[index], width, gridColumns)}
              onClick={(event) => handleSelect(event, block.id)}
            >
              <WidgetBlockContent
                block={block}
                rendered={renderedData(block, renderedBlocks)}
                locale={locale}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
