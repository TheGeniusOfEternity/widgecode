import {
  BLOCK_BORDER,
  BLOCK_LINE_HEIGHT,
  BLOCK_PADDING,
  BLOCK_RADIUS,
  CANVAS_RADIUS,
  MAX_BLOCK_HEIGHT,
  MAX_GRID_COLUMNS,
  TEXT_BLOCK_LINE_HEIGHT,
  blockBox,
  blockContentWidth,
  blockTypography,
  gridRows,
  type BlockTypography,
  type GridLayout,
} from './geometry.js';
import {
  difficultyColors,
  errorColor,
  formatStatValue,
  languageColor,
  paletteTokens,
  widgetLabels,
  type PaletteName,
  type PaletteTokens,
  type WidgetLocale,
} from './theme.js';

export { languageColor } from './theme.js';

export type WidgetCanvasBlock = {
  id: string;
  type: string;
  position: number;
  config: unknown;
};

export type WidgetCanvasRenderedBlock = {
  id: string;
  type: string;
  position: number;
  data?: unknown;
  error?: string;
};

export type WidgetCanvasProps = {
  title?: string;
  blocks: WidgetCanvasBlock[];
  palette?: string;
  paletteMode?: string;
  columns?: number;
  width?: number;
  height?: number;
  outputWidth?: number;
  outputHeight?: number;
  renderedBlocks?: WidgetCanvasRenderedBlock[];
  avatarDataUris?: Record<string, string>;
  locale?: WidgetLocale;
};

export const WIDGET_FONT_FAMILY =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

const numberFormatter = new Intl.NumberFormat('en-US');

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const mixHex = (left: string, right: string, leftWeight: number) => {
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

const formatNumber = (value: unknown, fallback = '—') =>
  typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : fallback;

const imageUrl = (value: unknown) => {
  const url = asString(value);
  return /^https?:\/\//i.test(url) ? url : null;
};

const safeId = (value: string) => value.replace(/[^a-z0-9_-]/gi, '-');

const layoutOf = (block: WidgetCanvasBlock): GridLayout => {
  const value = asRecord(asRecord(block.config).layout);
  return {
    x: clamp(asNumber(value.x), 0, MAX_GRID_COLUMNS - 1),
    y: Math.max(0, asNumber(value.y, block.position)),
    width: clamp(asNumber(value.width, 1), 1, MAX_GRID_COLUMNS),
    height: clamp(asNumber(value.height, 1), 1, MAX_BLOCK_HEIGHT),
  };
};

// Inter vertical metrics: ascent 0.96875em, content area 1.2109em.
const baseline = (top: number, size: number, lineHeight = BLOCK_LINE_HEIGHT) =>
  top + size * ((lineHeight - 1.2109) / 2 + 0.96875);

// SVG has no text layout, so widths are estimated from an average glyph width.
const fitText = (value: string, width: number, size: number, glyph = 0.56) => {
  const maxLength = Math.max(Math.floor(width / (size * glyph)), 1);
  return value.length > maxLength ? `${value.slice(0, Math.max(maxLength - 1, 1))}…` : value;
};

const linesOf = (value: string, maxLength: number, maxLines: number) => {
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

type TextProps = {
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

const SvgText = ({
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

const MultilineText = ({
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

type BlockFrame = { width: number; height: number; typography: BlockTypography };

type StatItem = { label: string; value: unknown };

// Mirrors `.statsRow` / `.stat` in the HTML canvas: equal columns, value above label.
const StatsRow = ({
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

const statsRowHeight = (t: BlockTypography) =>
  t.statValue * BLOCK_LINE_HEIGHT + 3 + t.meta * BLOCK_LINE_HEIGHT;

// Mirrors `.blockTitleRow`: bold title on the left, muted meta on the right.
const TitleRow = ({
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
  const metaWidth = Math.min(meta.length * t.meta * 0.56, frame.width * 0.45);
  return (
    <>
      <SvgText
        x={0}
        y={baseline(0, t.heading)}
        value={fitText(title, frame.width - metaWidth - 12, t.heading, 0.6)}
        fill={tokens.ink}
        size={t.heading}
        weight={800}
      />
      <SvgText
        x={frame.width}
        y={baseline(metaTop, t.meta)}
        value={fitText(meta, frame.width * 0.45, t.meta)}
        fill={tokens.ink}
        size={t.meta}
        anchor="end"
        opacity={0.6}
      />
    </>
  );
};

// Mirrors `.previewState` in the HTML canvas.
const PreviewState = ({
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

const BlockContent = ({
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

  if (!rendered?.data) {
    return (
      <SvgText
        x={0}
        y={baseline(0, t.meta)}
        value={labels.loading}
        fill={tokens.ink}
        size={t.meta}
        opacity={0.6}
      />
    );
  }

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
          value={fitText(asString(data.name, labels.githubProfile), textWidth, t.heading, 0.6)}
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
                  columnWidth - 13 - percent.length * t.meta * 0.6 - 6,
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

export const WidgetCanvas = ({
  title = 'WidgeCode widget',
  blocks,
  palette = 'lavender',
  paletteMode = 'light',
  columns = MAX_GRID_COLUMNS,
  width = 600,
  height = 400,
  outputWidth,
  outputHeight,
  renderedBlocks = [],
  avatarDataUris,
  locale = 'en',
}: WidgetCanvasProps) => {
  const canvasWidth = clamp(Math.round(width), 280, 1600);
  const canvasHeight = clamp(Math.round(height), 160, 1200);
  const svgWidth = outputWidth ?? canvasWidth;
  const svgHeight = outputHeight ?? canvasHeight;
  const paletteSet = paletteTokens[palette as PaletteName] ?? paletteTokens.lavender;
  const tokens = paletteMode === 'dark' ? paletteSet.dark : paletteSet.light;
  const gridColumns = clamp(Math.round(columns), 1, MAX_GRID_COLUMNS);
  const layouts = blocks.map(layoutOf);
  const rows = gridRows(layouts);
  const blockSurface = mixHex(tokens.surface, tokens.soft, 0.72);
  // CSS `radial-gradient(circle at 92% 2%, … 32%)` sizes to the farthest corner (bottom-left).
  const glowRadius = Math.hypot(canvasWidth * 0.92, canvasHeight * 0.98) * 0.32;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby="widget-title widget-description"
    >
      <title id="widget-title">{title}</title>
      <desc id="widget-description">Live developer statistics widget</desc>
      <defs>
        <linearGradient id="widget-surface" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tokens.surface} />
          <stop offset="100%" stopColor={tokens.soft} />
        </linearGradient>
        <radialGradient
          id="widget-accent-glow"
          gradientUnits="userSpaceOnUse"
          cx={canvasWidth * 0.92}
          cy={canvasHeight * 0.02}
          r={glowRadius}
        >
          <stop offset="0%" stopColor={tokens.accent} stopOpacity={0.22} />
          <stop offset="100%" stopColor={tokens.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect
        x={0.5}
        y={0.5}
        width={canvasWidth - 1}
        height={canvasHeight - 1}
        rx={CANVAS_RADIUS}
        fill="url(#widget-surface)"
      />
      <rect
        x={0.5}
        y={0.5}
        width={canvasWidth - 1}
        height={canvasHeight - 1}
        rx={CANVAS_RADIUS}
        fill="url(#widget-accent-glow)"
        stroke={tokens.accent}
        strokeOpacity={0.25}
      />
      <g fontFamily={WIDGET_FONT_FAMILY}>
        {blocks.length === 0 && (
          <SvgText
            x={canvasWidth / 2}
            y={canvasHeight / 2}
            value={widgetLabels(locale).empty}
            fill={tokens.ink}
            size={14}
            anchor="middle"
            opacity={0.6}
          />
        )}
        {blocks.map((block, index) => {
          const box = blockBox(layouts[index], {
            width: canvasWidth,
            height: canvasHeight,
            columns: gridColumns,
            rows,
          });
          const inset = BLOCK_BORDER + BLOCK_PADDING;
          const contentWidth = blockContentWidth(box.width);
          const frame = {
            width: contentWidth,
            height: Math.max(box.height - inset * 2, 0),
            typography: blockTypography(contentWidth),
          };
          const clipId = `block-${safeId(block.id)}`;
          return (
            <g key={block.id}>
              <clipPath id={clipId}>
                <rect x={box.x} y={box.y} width={box.width} height={box.height} rx={BLOCK_RADIUS} />
              </clipPath>
              <rect
                x={box.x + 0.5}
                y={box.y + 0.5}
                width={box.width - 1}
                height={box.height - 1}
                rx={BLOCK_RADIUS}
                fill={blockSurface}
                stroke={tokens.accent}
                strokeOpacity={0.18}
              />
              <g clipPath={`url(#${clipId})`}>
                <g transform={`translate(${box.x + inset} ${box.y + inset})`}>
                  <BlockContent
                    block={block}
                    rendered={renderedBlocks.find((item) => item.id === block.id)}
                    tokens={tokens}
                    locale={locale}
                    frame={frame}
                    avatarDataUri={avatarDataUris?.[block.id]}
                  />
                </g>
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
