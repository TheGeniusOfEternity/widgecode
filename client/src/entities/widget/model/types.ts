export type SourceType = 'github' | 'leetcode';
export type PaletteId = 'lavender' | 'midnight' | 'mint' | 'sunset' | 'cobalt' | 'paper';
export type PaletteMode = 'light' | 'dark' | 'auto';
export type BlockType = 'text' | 'github-stats' | 'github-langs' | 'leetcode-stats';

export type BlockLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WidgetSource = { username: string };

export type WidgetConfig = {
  sources?: Partial<Record<SourceType, WidgetSource>>;
  palette: PaletteId;
  paletteMode: PaletteMode;
  grid: { columns: number };
  renderFormat: 'iframe';
  presetId?: string;
};

export type WidgetBlock = {
  id: string;
  type: BlockType;
  position: number;
  config: Record<string, unknown>;
};

export type Widget = {
  id: string;
  title: string;
  slug: string;
  width: number;
  height: number;
  public: boolean;
  config: WidgetConfig;
  createdAt: string;
  updatedAt: string;
  blocks: WidgetBlock[];
};

export type WidgetCardData = {
  id: string;
  title: string;
  slug: string;
  source: string;
  metric: string;
  accent: PaletteId;
  paletteMode: PaletteMode;
  public: boolean;
  width: number;
  height: number;
  updatedAt: string;
};

export type RenderedBlock = {
  id: string;
  type: BlockType;
  position: number;
  data?: unknown;
  error?: string;
};

export type PublicWidgetResponse = {
  widget: Widget;
  rendered: {
    blocks: RenderedBlock[];
    cacheTtlSeconds: number;
  };
};
