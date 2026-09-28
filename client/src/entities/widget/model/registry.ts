import type { BlockType, PaletteId, SourceType } from '@/entities/widget/model/types';

export type PresetDefinition = {
  id: string;
  label: string;
  labelRu: string;
  description: string;
  descriptionRu: string;
  source: SourceType;
  blockTypes: BlockType[];
};

export const presets: PresetDefinition[] = [
  {
    id: 'github-overview',
    label: 'GitHub Overview',
    labelRu: 'Обзор GitHub',
    description: 'Profile reach, repositories and your language mix.',
    descriptionRu: 'Охват профиля, репозитории и языки программирования.',
    source: 'github',
    blockTypes: ['github-stats', 'github-langs'],
  },
  {
    id: 'github-stats',
    label: 'GitHub Stats',
    labelRu: 'Статистика GitHub',
    description: 'A compact profile snapshot for your README.',
    descriptionRu: 'Компактный снимок профиля для README.',
    source: 'github',
    blockTypes: ['github-stats'],
  },
  {
    id: 'github-languages',
    label: 'GitHub Languages',
    labelRu: 'Языки GitHub',
    description: 'A visual summary of languages in your repositories.',
    descriptionRu: 'Визуальная сводка языков в ваших репозиториях.',
    source: 'github',
    blockTypes: ['github-langs'],
  },
  {
    id: 'leetcode-profile',
    label: 'LeetCode Profile',
    labelRu: 'Профиль LeetCode',
    description: 'Solved problems, ranking and contest rating.',
    descriptionRu: 'Решённые задачи, рейтинг и рейтинг соревнований.',
    source: 'leetcode',
    blockTypes: ['leetcode-stats'],
  },
];

export const blockDefinitions: {
  type: BlockType;
  label: string;
  description: string;
  source: SourceType | null;
}[] = [
  {
    type: 'github-stats',
    label: 'GitHub Stats',
    description: 'Profile reach and repository count.',
    source: 'github',
  },
  {
    type: 'github-langs',
    label: 'GitHub Languages',
    description: 'Language distribution by repository size.',
    source: 'github',
  },
  {
    type: 'leetcode-stats',
    label: 'LeetCode Profile',
    description: 'Solved problems and competition profile.',
    source: 'leetcode',
  },
  {
    type: 'text',
    label: 'Text Note',
    description: 'A small personal message or heading.',
    source: null,
  },
];

export const palettes: { id: PaletteId; label: string; colors: string[] }[] = [
  { id: 'lavender', label: 'Lavender', colors: ['#8f71e8', '#c9b7ff', '#f5efff'] },
  { id: 'midnight', label: 'Midnight', colors: ['#1e294d', '#6075c9', '#d6e0ff'] },
  { id: 'mint', label: 'Mint', colors: ['#2caa8a', '#94e5c7', '#e9fff7'] },
  { id: 'sunset', label: 'Sunset', colors: ['#dc7657', '#f4b18d', '#fff1e9'] },
  { id: 'cobalt', label: 'Cobalt', colors: ['#2868d3', '#83b6ff', '#ecf4ff'] },
  { id: 'paper', label: 'Paper', colors: ['#635f5a', '#c9c1b8', '#f8f4ed'] },
];

export const defaultBlockConfig = (type: BlockType): Record<string, unknown> => {
  if (type === 'text') return { text: 'Build something worth sharing.', align: 'left' };
  if (type === 'github-stats')
    return { showRepositories: true, showFollowers: true, showFollowing: true };
  if (type === 'github-langs') return { limit: 5 };
  return { showRanking: true, showContestRating: true };
};

export const getPreset = (id: string | undefined) => presets.find((preset) => preset.id === id);

export { paletteTokens, type PaletteTokens } from '@shared/widget/theme';
