// Block shapes accepted by the widget renderers (API rows and editor state both fit).

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
