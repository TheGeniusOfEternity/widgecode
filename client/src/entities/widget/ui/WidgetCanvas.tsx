import type { CSSProperties, MouseEvent } from 'react';

import type {
  BlockLayout,
  BlockType,
  PaletteId,
  PaletteMode,
  RenderedBlock,
  WidgetBlock,
} from '@/entities/widget/model';
import { paletteTokens } from '@/entities/widget/model';
import styles from '@/entities/widget/ui/WidgetCanvas.module.css';

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
};

const sampleData: Record<BlockType, Record<string, unknown>> = {
  text: { text: 'Build something worth sharing.', align: 'left' },
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
  'leetcode-stats': {
    username: 'your-profile',
    ranking: 18_240,
    contestRating: 1_726,
    solved: { all: 312, easy: 148, medium: 132, hard: 32 },
  },
};

const renderedData = (block: WidgetBlock, renderedBlocks?: RenderedBlock[]) =>
  renderedBlocks?.find((rendered) => rendered.id === block.id);

const getBlockLayout = (block: WidgetBlock): BlockLayout => {
  const value = block.config.layout;
  if (!value || typeof value !== 'object') return { x: 0, y: 0, width: 2, height: 1 };
  const layout = value as Partial<BlockLayout>;
  return {
    x: typeof layout.x === 'number' ? layout.x : 0,
    y: typeof layout.y === 'number' ? layout.y : 0,
    width: typeof layout.width === 'number' ? layout.width : 2,
    height: typeof layout.height === 'number' ? layout.height : 1,
  };
};

const formatNumber = (value: number | undefined) =>
  value === undefined ? '—' : value.toLocaleString();

type BlockData = {
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

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className={styles.stat}>
    <strong>{typeof value === 'number' ? formatNumber(value) : value}</strong>
    <span>{label}</span>
  </div>
);

export const WidgetBlockContent = ({
  block,
  rendered,
}: {
  block: WidgetBlock;
  rendered?: RenderedBlock;
}) => {
  if (rendered?.error) return <p className={styles.error}>{rendered.error}</p>;
  const data = (rendered?.data as BlockData | undefined) ?? (sampleData[block.type] as BlockData);

  if (block.type === 'text') {
    const align =
      block.config.align === 'center' || block.config.align === 'right'
        ? block.config.align
        : 'left';
    return (
      <p className={styles.textBlock} style={{ textAlign: align }}>
        {String(block.config.text || sampleData.text.text)}
      </p>
    );
  }

  if (block.type === 'github-stats') {
    return (
      <div className={styles.statsBlock}>
        <div className={styles.blockHeading}>
          <div className={styles.avatar}>
            {String(data.name || data.username || 'G')
              .slice(0, 1)
              .toUpperCase()}
          </div>
          <div>
            <strong>{String(data.name || 'GitHub profile')}</strong>
            <span>@{String(data.username || 'username')}</span>
          </div>
        </div>
        <div className={styles.statsRow}>
          {block.config.showRepositories !== false && (
            <Stat label="Repos" value={data.publicRepositories ?? 42} />
          )}
          {block.config.showFollowers !== false && (
            <Stat label="Followers" value={data.followers ?? 4_321} />
          )}
          {block.config.showFollowing !== false && (
            <Stat label="Following" value={data.following ?? 12} />
          )}
        </div>
      </div>
    );
  }

  if (block.type === 'github-langs') {
    const languages = data.languages ?? [];
    return (
      <div className={styles.languageBlock}>
        <div className={styles.blockTitleRow}>
          <strong>Languages</strong>
          <span>top {languages.length || 4}</span>
        </div>
        <div className={styles.languageBar}>
          {languages.map((language) => (
            <span key={language.name} style={{ flexBasis: `${language.percentage}%` }} />
          ))}
        </div>
        <div className={styles.languageList}>
          {languages.map((language) => (
            <span key={language.name}>
              <i /> {language.name} <b>{language.percentage}%</b>
            </span>
          ))}
        </div>
      </div>
    );
  }

  const solved = data.solved;
  return (
    <div className={styles.statsBlock}>
      <div className={styles.blockTitleRow}>
        <strong>LeetCode profile</strong>
        <span>@{String(data.username || 'username')}</span>
      </div>
      <div className={styles.statsRow}>
        <Stat label="Solved" value={solved?.all ?? 312} />
        {block.config.showRanking !== false && (
          <Stat label="Ranking" value={data.ranking ?? 18_240} />
        )}
        {block.config.showContestRating !== false && (
          <Stat label="Rating" value={data.contestRating ?? 1_726} />
        )}
      </div>
      <div className={styles.difficultyRow}>
        <span>
          <i className={styles.easy} /> Easy {solved?.easy ?? 148}
        </span>
        <span>
          <i className={styles.medium} /> Medium {solved?.medium ?? 132}
        </span>
        <span>
          <i className={styles.hard} /> Hard {solved?.hard ?? 32}
        </span>
      </div>
    </div>
  );
};

export const WidgetCanvas = ({
  blocks,
  palette,
  paletteMode = 'auto',
  columns = 1,
  width,
  height,
  renderedBlocks,
  interactive = false,
  selectedBlockId,
  onSelectBlock,
}: WidgetCanvasProps) => {
  const tokens = paletteTokens[palette];
  const style = {
    '--widget-light-accent': tokens.light.accent,
    '--widget-light-soft': tokens.light.soft,
    '--widget-light-ink': tokens.light.ink,
    '--widget-light-surface': tokens.light.surface,
    '--widget-dark-accent': tokens.dark.accent,
    '--widget-dark-soft': tokens.dark.soft,
    '--widget-dark-ink': tokens.dark.ink,
    '--widget-dark-surface': tokens.dark.surface,
    '--widget-columns': Math.max(1, Math.min(columns, 2)),
    '--widget-width': width ? `${width}px` : undefined,
    '--widget-height': height ? `${height}px` : undefined,
  } as CSSProperties;

  const handleSelect = (event: MouseEvent<HTMLElement>, id: string) => {
    if (!interactive || !onSelectBlock) return;
    event.stopPropagation();
    onSelectBlock(id);
  };

  return (
    <div className={styles.canvas} style={style} data-palette-mode={paletteMode}>
      <div className={styles.canvasHeader}>
        <span className={styles.brandDot} />
        <span>live widget preview</span>
      </div>
      <div className={styles.blocks}>
        {blocks.length === 0 && (
          <p className={styles.empty}>Add a block to start shaping your widget.</p>
        )}
        {blocks.map((block) => (
          <article
            className={`${styles.block} ${selectedBlockId === block.id ? styles.selected : ''}`}
            key={block.id}
            style={{
              gridColumn: `${getBlockLayout(block).x + 1} / span ${getBlockLayout(block).width}`,
              gridRow: `${getBlockLayout(block).y + 1} / span ${getBlockLayout(block).height}`,
            }}
            onClick={(event) => handleSelect(event, block.id)}
          >
            <WidgetBlockContent block={block} rendered={renderedData(block, renderedBlocks)} />
          </article>
        ))}
      </div>
      <div className={styles.canvasFooter}>
        <span>
          {blocks.length} block{blocks.length === 1 ? '' : 's'}
        </span>
        <span>updates every 15 min</span>
      </div>
    </div>
  );
};
