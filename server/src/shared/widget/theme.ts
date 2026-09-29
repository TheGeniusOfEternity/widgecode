import { estimateTextWidth } from './geometry.js';

// Colors and labels shared by the HTML and SVG widget renderers.

export type PaletteTokens = { accent: string; soft: string; ink: string; surface: string };

export const paletteTokens = {
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
} as const satisfies Record<string, { light: PaletteTokens; dark: PaletteTokens }>;

export type PaletteName = keyof typeof paletteTokens;

// Contribution levels 0–4 as accent opacity; level 0 uses the ink color instead.
export const heatmapOpacity = [0.1, 0.35, 0.55, 0.78, 1] as const;

export const difficultyColors = { easy: '#22a477', medium: '#c88724', hard: '#d45c71' } as const;
export const errorColor = '#a54352';

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

export const languageColor = (name: string) =>
  githubLanguageColors[name.trim().toLowerCase()] ?? '#8b949e';

const labels = {
  en: {
    repositories: 'Repos',
    followers: 'Followers',
    following: 'Following',
    githubProfile: 'GitHub profile',
    languages: 'Languages',
    top: 'top',
    leetcodeProfile: 'LeetCode profile',
    solved: 'Solved',
    ranking: 'Ranking',
    contestRating: 'Contest rating',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    addUsername: 'Add a username',
    addUsernameHint: (source: string) => `Add a ${source} username in block settings`,
    defaultText: 'Build something worth sharing.',
    empty: 'Add a block to start shaping your widget.',
    loading: 'Loading...',
    activity: 'Activity',
    commits: 'Commits',
    currentStreak: 'Day streak',
    longestStreak: 'Best streak',
    pullRequests: 'Pull requests',
    total: 'Total',
    merged: 'Merged',
    open: 'Open',
    closed: 'Closed',
    status: 'Status',
    busy: 'Busy',
    noStatus: 'No status set',
  },
  ru: {
    repositories: 'Репозитории',
    followers: 'Подписчики',
    following: 'Подписки',
    githubProfile: 'Профиль GitHub',
    languages: 'Языки',
    top: 'топ',
    leetcodeProfile: 'Профиль LeetCode',
    solved: 'Решено',
    ranking: 'Рейтинг',
    contestRating: 'Рейтинг соревнований',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    addUsername: 'Добавьте username',
    addUsernameHint: (source: string) => `Укажите ${source} username в настройках блока`,
    defaultText: 'Создайте что-то достойное публикации.',
    empty: 'Добавьте блок, чтобы начать.',
    loading: 'Загрузка...',
    activity: 'Активность',
    commits: 'Коммиты',
    currentStreak: 'Дней подряд',
    longestStreak: 'Рекорд',
    pullRequests: 'Pull requests',
    total: 'Всего',
    merged: 'Слито',
    open: 'Открыто',
    closed: 'Закрыто',
    status: 'Статус',
    busy: 'Занят',
    noStatus: 'Статус не задан',
  },
};

export type WidgetLocale = keyof typeof labels;

export const widgetLabels = (locale: WidgetLocale) => labels[locale];

const fullNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Formats a stat value so it fits its column: full digits when they fit, compact notation
 * (24.3K) otherwise. Both renderers call this with the same inputs, so they agree.
 */
export const formatStatValue = (value: unknown, columnWidth?: number, fontSize?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const full = fullNumber.format(value);
  if (!columnWidth || !fontSize) return full;
  // Stat values render at weight 800 with letter-spacing -0.06em.
  return estimateTextWidth(full, fontSize, { weight: 800, letterSpacing: -0.06 }) <= columnWidth
    ? full
    : compactNumber.format(value);
};
