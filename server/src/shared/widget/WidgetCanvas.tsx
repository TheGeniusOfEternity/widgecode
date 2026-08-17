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
  locale?: 'ru' | 'en';
  showChrome?: boolean;
};

type PaletteTokens = {
  accent: string;
  soft: string;
  ink: string;
  surface: string;
};

const paletteTokens: Record<string, { light: PaletteTokens; dark: PaletteTokens }> = {
  lavender: {
    light: { accent: '#8f71e8', soft: '#eee8ff', ink: '#27213d', surface: '#fbf9ff' },
    dark: { accent: '#bda9ff', soft: '#30274f', ink: '#f4efff', surface: '#191526' },
  },
  midnight: {
    light: { accent: '#6075c9', soft: '#e4eaff', ink: '#17213d', surface: '#f7f9ff' },
    dark: { accent: '#91a4ff', soft: '#263258', ink: '#eef1ff', surface: '#11172b' },
  },
  mint: {
    light: { accent: '#2caa8a', soft: '#ddf7ee', ink: '#143a31', surface: '#f7fffc' },
    dark: { accent: '#73d9b8', soft: '#183d35', ink: '#e7fff7', surface: '#11221f' },
  },
  sunset: {
    light: { accent: '#dc7657', soft: '#ffeadf', ink: '#47241a', surface: '#fffaf7' },
    dark: { accent: '#ff9e7a', soft: '#4a2b25', ink: '#fff0ea', surface: '#251714' },
  },
  cobalt: {
    light: { accent: '#2868d3', soft: '#e5efff', ink: '#152e59', surface: '#f8fbff' },
    dark: { accent: '#72a9ff', soft: '#1d3868', ink: '#edf4ff', surface: '#101c32' },
  },
  paper: {
    light: { accent: '#635f5a', soft: '#eee9e2', ink: '#302d29', surface: '#fffdf9' },
    dark: { accent: '#c9c1b8', soft: '#3a3733', ink: '#f7f1e8', surface: '#211f1d' },
  },
};

const githubLanguageColors: Record<string, string> = {
  assembly: '#6e4c13',
  c: '#555555',
  'c#': '#178600',
  'c++': '#f34b7d',
  css: '#663399',
  dart: '#00b4ab',
  go: '#00add8',
  html: '#e34c26',
  java: '#b07219',
  javascript: '#f1e05a',
  kotlin: '#a97bff',
  lua: '#000080',
  'objective-c': '#438eff',
  perl: '#0298c3',
  php: '#4f5d95',
  python: '#3572a5',
  r: '#198ce7',
  ruby: '#701516',
  rust: '#dea584',
  scala: '#c22d40',
  shell: '#89e051',
  svelte: '#ff3e00',
  swift: '#f05138',
  typescript: '#3178c6',
  vue: '#41b883',
};

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

export const languageColor = (name: string) =>
  githubLanguageColors[name.trim().toLowerCase()] ?? '#8b949e';

const imageUrl = (value: unknown) => {
  const url = asString(value);
  return /^https?:\/\//i.test(url) ? url : null;
};

const safeId = (value: string) => value.replace(/[^a-z0-9_-]/gi, '-');

const layoutOf = (block: WidgetCanvasBlock) => {
  const value = asRecord(asRecord(block.config).layout);
  return {
    x: clamp(asNumber(value.x), 0, 1),
    y: Math.max(0, asNumber(value.y, block.position)),
    width: clamp(asNumber(value.width, 1), 1, 2),
    height: clamp(asNumber(value.height, 1), 1, 2),
  };
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
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(maxLength - 3, 1))}...`;
  }
  return lines.length > 0 ? lines : [''];
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
}: {
  x: number;
  y: number;
  value: unknown;
  fill: string;
  size: number;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  letterSpacing?: string;
}) => (
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
  x,
  y,
  value,
  fill,
  size,
  weight,
  anchor,
  maxLength,
  maxLines,
  letterSpacing,
}: {
  x: number;
  y: number;
  value: string;
  fill: string;
  size: number;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  maxLength: number;
  maxLines: number;
  letterSpacing?: string;
}) => (
  <>
    {linesOf(value, maxLength, maxLines).map((line, index) => (
      <SvgText
        key={`${line}-${index}`}
        x={x}
        y={y + index * size * 1.35}
        value={line}
        fill={fill}
        size={size}
        weight={weight}
        anchor={anchor}
        letterSpacing={letterSpacing}
      />
    ))}
  </>
);

const Stat = ({
  x,
  y,
  label,
  value,
  tokens,
}: {
  x: number;
  y: number;
  label: string;
  value: unknown;
  tokens: PaletteTokens;
}) => (
  <g>
    <SvgText
      x={x}
      y={y + 24}
      value={formatNumber(value)}
      fill={tokens.ink}
      size={30}
      weight={800}
      letterSpacing="-0.06em"
    />
    <SvgText x={x} y={y + 43} value={label} fill={tokens.ink} size={12} opacity={0.6} />
  </g>
);

const PreviewState = ({
  x,
  y,
  width,
  source,
  locale,
  tokens,
}: {
  x: number;
  y: number;
  width: number;
  source: 'github' | 'leetcode';
  locale: 'ru' | 'en';
  tokens: PaletteTokens;
}) => (
  <g>
    <rect
      x={x}
      y={y - 28}
      width={width}
      height={76}
      rx={14}
      fill={tokens.accent}
      fillOpacity={0.07}
      stroke={tokens.accent}
      strokeOpacity={0.3}
      strokeDasharray="5 5"
    />
    <rect
      x={x + 14}
      y={y - 10}
      width={32}
      height={32}
      rx={10}
      fill={tokens.accent}
      fillOpacity={0.12}
    />
    <SvgText
      x={x + 30}
      y={y + 12}
      value="@"
      fill={tokens.accent}
      size={13}
      weight={800}
      anchor="middle"
    />
    <SvgText
      x={x + 58}
      y={y + 2}
      value={locale === 'ru' ? 'Добавьте username' : 'Add a username'}
      fill={tokens.ink}
      size={13}
      weight={700}
    />
    <SvgText
      x={x + 58}
      y={y + 20}
      value={
        locale === 'ru'
          ? `Укажите ${source} username в настройках блока`
          : `Add a ${source} username in block settings`
      }
      fill={tokens.ink}
      size={11}
      opacity={0.62}
    />
  </g>
);

const BlockContent = ({
  block,
  rendered,
  tokens,
  locale,
  width,
  height,
}: {
  block: WidgetCanvasBlock;
  rendered?: WidgetCanvasRenderedBlock;
  tokens: PaletteTokens;
  locale: 'ru' | 'en';
  width: number;
  height: number;
}) => {
  const padding = Math.min(20, Math.max(10, width * 0.04));
  const contentWidth = Math.max(width - padding * 2, 80);
  const contentHeight = Math.max(height - padding * 2, 80);
  const config = asRecord(block.config);
  const data = asRecord(rendered?.data);
  const source = block.type.startsWith('github')
    ? 'github'
    : block.type.startsWith('leetcode')
      ? 'leetcode'
      : null;
  const username = asString(config.username);

  if (rendered?.error) {
    return (
      <MultilineText
        x={padding}
        y={padding + 18}
        value={rendered.error}
        fill="#a54352"
        size={13}
        maxLength={Math.max(Math.floor(width / 8), 16)}
        maxLines={3}
      />
    );
  }

  if (block.type === 'text') {
    const align = config.align === 'center' || config.align === 'right' ? config.align : 'left';
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
    const x = align === 'center' ? width / 2 : align === 'right' ? width - padding : padding;
    return (
      <MultilineText
        x={x}
        y={padding + Math.min(contentHeight / 2, 44)}
        value={asString(
          config.text,
          locale === 'ru'
            ? 'Создайте что-то достойное публикации.'
            : 'Build something worth sharing.',
        )}
        fill={tokens.ink}
        size={Math.min(34, Math.max(16, contentWidth * 0.12))}
        weight={800}
        anchor={anchor}
        maxLength={Math.max(Math.floor(contentWidth / 10), 16)}
        maxLines={4}
        letterSpacing="-0.05em"
      />
    );
  }

  if (source && !username && !rendered) {
    return (
      <PreviewState
        x={padding}
        y={padding + 24}
        width={contentWidth}
        source={source}
        locale={locale}
        tokens={tokens}
      />
    );
  }

  if (!rendered?.data) {
    return (
      <SvgText
        x={padding}
        y={padding + 20}
        value={locale === 'ru' ? 'Загрузка...' : 'Loading...'}
        fill={tokens.ink}
        size={14}
        weight={650}
      />
    );
  }

  if (block.type === 'github-stats') {
    const avatarSize = clamp(width * 0.16, 24, 42);
    const avatarUrl = imageUrl(data.avatarUrl);
    const avatarId = `avatar-${safeId(block.id)}`;
    const headingX = padding + avatarSize + 12;
    const statsY = padding + avatarSize + 18;
    const labels =
      locale === 'ru'
        ? { repositories: 'Репозитории', followers: 'Подписчики', following: 'Подписки' }
        : { repositories: 'Repos', followers: 'Followers', following: 'Following' };
    const stats = [
      config.showRepositories !== false
        ? { label: labels.repositories, value: data.publicRepositories }
        : null,
      config.showFollowers !== false ? { label: labels.followers, value: data.followers } : null,
      config.showFollowing !== false ? { label: labels.following, value: data.following } : null,
    ].filter((item): item is { label: string; value: unknown } => item !== null);
    const statWidth = contentWidth / Math.max(stats.length, 1);
    return (
      <>
        <rect
          x={padding}
          y={padding}
          width={avatarSize}
          height={avatarSize}
          rx={14}
          fill={tokens.accent}
          fillOpacity={0.22}
        />
        {avatarUrl && (
          <>
            <clipPath id={avatarId}>
              <rect x={padding} y={padding} width={avatarSize} height={avatarSize} rx={14} />
            </clipPath>
            <image
              href={avatarUrl}
              x={padding}
              y={padding}
              width={avatarSize}
              height={avatarSize}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${avatarId})`}
            />
          </>
        )}
        <SvgText
          x={headingX}
          y={padding + 18}
          value={asString(data.name, 'GitHub profile')}
          fill={tokens.ink}
          size={18}
          weight={800}
        />
        <SvgText
          x={headingX}
          y={padding + 38}
          value={`@${asString(data.username, username || 'username')}`}
          fill={tokens.ink}
          size={12}
          opacity={0.64}
        />
        {stats.map((item, index) => (
          <Stat
            key={item.label}
            x={padding + index * statWidth}
            y={statsY}
            label={item.label}
            value={item.value}
            tokens={tokens}
          />
        ))}
      </>
    );
  }

  if (block.type === 'github-langs') {
    const languages = Array.isArray(data.languages)
      ? data.languages.filter((item): item is { name: string; percentage: number } => {
          const value = asRecord(item);
          return typeof value.name === 'string' && typeof value.percentage === 'number';
        })
      : [];
    const rows = languages.slice(0, 8);
    const barY = padding + 50;
    const itemWidth = contentWidth / 2;
    return (
      <>
        <SvgText
          x={padding}
          y={padding + 18}
          value={locale === 'ru' ? 'Языки' : 'Languages'}
          fill={tokens.ink}
          size={18}
          weight={800}
        />
        <SvgText
          x={width - padding}
          y={padding + 18}
          value={`${locale === 'ru' ? 'топ' : 'top'} ${rows.length || 4}`}
          fill={tokens.ink}
          size={11}
          weight={650}
          anchor="end"
          opacity={0.6}
        />
        <rect x={padding} y={barY} width={contentWidth} height={10} rx={5} fill={tokens.soft} />
        {rows.map((language, index) => {
          const segmentWidth = Math.max((language.percentage / 100) * contentWidth, 2);
          const x =
            padding +
            rows
              .slice(0, index)
              .reduce((sum, item) => sum + (item.percentage / 100) * contentWidth, 0);
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
        {rows.map((language, index) => {
          const column = index % 2;
          const row = Math.floor(index / 2);
          const x = padding + column * itemWidth;
          const y = barY + 34 + row * 26;
          return (
            <g key={language.name}>
              <circle cx={x + 4} cy={y - 4} r={3.5} fill={languageColor(language.name)} />
              <SvgText
                x={x + 14}
                y={y}
                value={language.name}
                fill={tokens.ink}
                size={12}
                weight={650}
              />
              <SvgText
                x={x + itemWidth - 4}
                y={y}
                value={`${language.percentage}%`}
                fill={tokens.ink}
                size={12}
                weight={750}
                anchor="end"
                opacity={0.7}
              />
            </g>
          );
        })}
      </>
    );
  }

  const solved = asRecord(data.solved);
  const stats = [
    { label: locale === 'ru' ? 'Решено' : 'Solved', value: solved.all },
    config.showRanking !== false
      ? { label: locale === 'ru' ? 'Рейтинг' : 'Ranking', value: data.ranking }
      : null,
    config.showContestRating !== false
      ? {
          label: locale === 'ru' ? 'Рейтинг соревнований' : 'Contest rating',
          value: data.contestRating,
        }
      : null,
  ].filter((item): item is { label: string; value: unknown } => item !== null);
  const statWidth = contentWidth / Math.max(stats.length, 1);
  const statsY = padding + 50;
  const difficulty = [
    { label: 'Easy', value: solved.easy, color: '#22a477' },
    { label: 'Medium', value: solved.medium, color: '#c88724' },
    { label: 'Hard', value: solved.hard, color: '#d45c71' },
  ];
  return (
    <>
      <SvgText
        x={padding}
        y={padding + 18}
        value={locale === 'ru' ? 'Профиль LeetCode' : 'LeetCode profile'}
        fill={tokens.ink}
        size={18}
        weight={800}
      />
      <SvgText
        x={padding}
        y={padding + 38}
        value={`@${asString(data.username, username || 'username')}`}
        fill={tokens.ink}
        size={12}
        opacity={0.64}
      />
      {stats.map((item, index) => (
        <Stat
          key={item.label}
          x={padding + index * statWidth}
          y={statsY}
          label={item.label}
          value={item.value}
          tokens={tokens}
        />
      ))}
      {difficulty.map((item, index) => {
        const x = padding + index * (contentWidth / difficulty.length);
        return (
          <g key={item.label}>
            <circle cx={x + 4} cy={statsY + 78} r={3.5} fill={item.color} />
            <SvgText
              x={x + 14}
              y={statsY + 82}
              value={`${item.label} ${formatNumber(item.value, '0')}`}
              fill={tokens.ink}
              size={11}
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
  paletteMode = 'auto',
  columns = 1,
  width = 600,
  height = 400,
  outputWidth,
  outputHeight,
  renderedBlocks = [],
  locale = 'en',
  showChrome = false,
}: WidgetCanvasProps) => {
  const canvasWidth = clamp(Math.round(width), 280, 1600);
  const canvasHeight = clamp(Math.round(height), 160, 1200);
  const svgWidth = outputWidth ?? canvasWidth;
  const svgHeight = outputHeight ?? canvasHeight;
  const paletteSet = paletteTokens[palette] ?? paletteTokens.lavender;
  const tokens = paletteMode === 'dark' ? paletteSet.dark : paletteSet.light;
  const gridColumns = clamp(Math.round(columns), 1, 2);
  const padding = Math.min(34, Math.max(20, canvasWidth * 0.04));
  const gap = 18;
  const chromeHeight = showChrome ? 30 : 0;
  const rows = Math.max(
    1,
    ...blocks.map((block) => {
      const layout = layoutOf(block);
      return layout.y + layout.height;
    }),
  );
  const blockAreaTop = padding + chromeHeight;
  const blockAreaHeight = canvasHeight - blockAreaTop - padding - (showChrome ? 28 : 0);
  const cellWidth = (canvasWidth - padding * 2 - gap * (gridColumns - 1)) / gridColumns;
  const cellHeight = Math.max(1, (blockAreaHeight - gap * (rows - 1)) / rows);
  const blockSurface = mixHex(tokens.surface, tokens.soft, 0.72);

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
          r={Math.max(canvasWidth, canvasHeight) * 0.32}
        >
          <stop offset="0%" stopColor={tokens.accent} stopOpacity={0.22} />
          <stop offset="100%" stopColor={tokens.accent} stopOpacity={0} />
        </radialGradient>
        <filter id="widget-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow
            dx="0"
            dy="22"
            stdDeviation="30"
            floodColor={tokens.accent}
            floodOpacity={0.18}
          />
        </filter>
      </defs>
      <rect
        x={0.5}
        y={0.5}
        width={canvasWidth - 1}
        height={canvasHeight - 1}
        rx={28}
        fill="url(#widget-surface)"
        stroke={tokens.accent}
        strokeOpacity={0.25}
        filter="url(#widget-shadow)"
      />
      <rect
        x={1}
        y={1}
        width={canvasWidth - 2}
        height={canvasHeight - 2}
        rx={27.5}
        fill="url(#widget-accent-glow)"
      />
      {showChrome && (
        <g>
          <circle cx={padding + 4} cy={padding - 8} r={4} fill={tokens.accent} />
          <SvgText
            x={padding + 18}
            y={padding - 4}
            value="live widget preview"
            fill={tokens.ink}
            size={11}
            weight={700}
            opacity={0.58}
          />
        </g>
      )}
      <g fontFamily="Inter, Arial, sans-serif">
        {blocks.length === 0 && (
          <SvgText
            x={canvasWidth / 2}
            y={canvasHeight / 2}
            value={
              locale === 'ru'
                ? 'Добавьте блок, чтобы начать.'
                : 'Add a block to start shaping your widget.'
            }
            fill={tokens.ink}
            size={14}
            anchor="middle"
            opacity={0.6}
          />
        )}
        {blocks.map((block) => {
          const layout = layoutOf(block);
          const x = padding + layout.x * (cellWidth + gap);
          const y = blockAreaTop + layout.y * (cellHeight + gap);
          const blockWidth = cellWidth * layout.width + gap * (layout.width - 1);
          const blockHeight = cellHeight * layout.height + gap * (layout.height - 1);
          const rendered = renderedBlocks.find((item) => item.id === block.id);
          return (
            <g key={block.id}>
              <rect
                x={x}
                y={y}
                width={blockWidth}
                height={blockHeight}
                rx={20}
                fill={blockSurface}
                stroke={tokens.accent}
                strokeOpacity={0.18}
              />
              <g transform={`translate(${x} ${y})`}>
                <BlockContent
                  block={block}
                  rendered={rendered}
                  tokens={tokens}
                  locale={locale}
                  width={blockWidth}
                  height={blockHeight}
                />
              </g>
            </g>
          );
        })}
      </g>
      {showChrome && (
        <SvgText
          x={padding}
          y={canvasHeight - padding + 4}
          value={`${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}`}
          fill={tokens.ink}
          size={11}
          weight={700}
          opacity={0.58}
        />
      )}
    </svg>
  );
};
