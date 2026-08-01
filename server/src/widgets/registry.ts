import { z } from 'zod';

export const BLOCK_TYPES = ['text', 'github-stats', 'github-langs', 'leetcode-stats'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const SOURCE_TYPES = ['github', 'leetcode'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const PALETTE_IDS = ['lavender', 'midnight', 'mint', 'sunset', 'cobalt', 'paper'] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];
export const PALETTE_MODES = ['light', 'dark', 'auto'] as const;
export type PaletteMode = (typeof PALETTE_MODES)[number];

export const MAX_WIDGET_BLOCKS = 5;
export const MAX_GRID_COLUMNS = 2;

export const blockTypeSchema = z.enum(BLOCK_TYPES);
export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export const paletteSchema = z.enum(PALETTE_IDS);
export const paletteModeSchema = z.enum(PALETTE_MODES);

export const blockLayoutSchema = z.object({
  x: z
    .number()
    .int()
    .min(0)
    .max(MAX_GRID_COLUMNS - 1),
  y: z.number().int().min(0).max(100),
  width: z.number().int().min(1).max(MAX_GRID_COLUMNS),
  height: z.number().int().min(1).max(2),
});

export type BlockLayout = z.infer<typeof blockLayoutSchema>;

const usernameSchema = z.string().trim().max(100).optional();

const sharedBlockFields = {
  layout: blockLayoutSchema.default({ x: 0, y: 0, width: 1, height: 1 }),
};

const blockSchemas: Record<BlockType, z.ZodType> = {
  text: z.object({
    text: z.string().trim().min(1).max(500),
    align: z.enum(['left', 'center', 'right']).default('left'),
    ...sharedBlockFields,
  }),
  'github-stats': z.object({
    username: usernameSchema,
    showRepositories: z.boolean().default(true),
    showFollowers: z.boolean().default(true),
    showFollowing: z.boolean().default(true),
    ...sharedBlockFields,
  }),
  'github-langs': z.object({
    username: usernameSchema,
    limit: z.number().int().min(3).max(8).default(5),
    ...sharedBlockFields,
  }),
  'leetcode-stats': z.object({
    username: usernameSchema,
    showRanking: z.boolean().default(true),
    showContestRating: z.boolean().default(true),
    ...sharedBlockFields,
  }),
};

export const widgetSourceSchema = z.object({
  username: z.string().trim().min(1).max(100),
});

export const widgetConfigSchema = z.object({
  // Kept optional for one release so old widgets can be normalized on save.
  sources: z
    .object({
      github: widgetSourceSchema.optional(),
      leetcode: widgetSourceSchema.optional(),
    })
    .optional(),
  palette: paletteSchema.default('lavender'),
  paletteMode: paletteModeSchema.default('auto'),
  grid: z
    .object({ columns: z.number().int().min(1).max(MAX_GRID_COLUMNS) })
    .default({ columns: MAX_GRID_COLUMNS }),
  renderFormat: z.literal('iframe').default('iframe'),
  presetId: z.string().trim().min(1).max(80).optional(),
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;

export const presetDefinitions = {
  custom: {
    label: 'Custom',
    source: 'github',
    blocks: [],
  },
  'github-overview': {
    label: 'GitHub Overview',
    source: 'github',
    blocks: [
      { type: 'github-stats', config: {} },
      { type: 'github-langs', config: { limit: 5 } },
    ],
  },
  'github-stats': {
    label: 'GitHub Stats',
    source: 'github',
    blocks: [{ type: 'github-stats', config: {} }],
  },
  'github-languages': {
    label: 'GitHub Languages',
    source: 'github',
    blocks: [{ type: 'github-langs', config: { limit: 5 } }],
  },
  'leetcode-profile': {
    label: 'LeetCode Profile',
    source: 'leetcode',
    blocks: [{ type: 'leetcode-stats', config: {} }],
  },
} as const satisfies Record<
  string,
  {
    label: string;
    source: SourceType;
    blocks: { type: BlockType; config: Record<string, unknown> }[];
  }
>;

export type PresetId = keyof typeof presetDefinitions;

export const getDefaultBlockConfig = (type: BlockType) => {
  const parsed = blockSchemas[type].safeParse(
    type === 'text' ? { text: 'Build something worth sharing.' } : {},
  );
  return parsed.success ? parsed.data : {};
};

export const parseBlockConfig = (type: BlockType, config: unknown) => {
  const result = blockSchemas[type].safeParse(config);
  if (!result.success) return result;
  return result;
};

export const getSourceForBlock = (type: BlockType): SourceType | null => {
  if (type.startsWith('github')) return 'github';
  if (type.startsWith('leetcode')) return 'leetcode';
  return null;
};
