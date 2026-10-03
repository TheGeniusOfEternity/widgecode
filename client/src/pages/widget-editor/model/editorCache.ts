import type { Widget } from '@/entities/widget/model';

// Unsaved editor state survives reloads and crashes until the next successful save.
type CachedEditorState = { savedAt: number; widget: Widget };

// v5: layouts use the 4-column grid; older drafts hold 2-column layouts and are ignored.
const cacheKey = (widgetId: string) => `widget-editor:v5:${widgetId}`;

export const readCachedWidget = (widgetId: string): Widget | null => {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(widgetId)) ?? '') as CachedEditorState;
    return cached.widget;
  } catch {
    return null;
  }
};

export const writeCachedWidget = (widget: Widget) => {
  try {
    localStorage.setItem(
      cacheKey(widget.id),
      JSON.stringify({ savedAt: Date.now(), widget } satisfies CachedEditorState),
    );
  } catch {
    // Storage can be full or disabled; the editor still works, just without crash recovery.
  }
};

export const clearCachedWidget = (widgetId: string) => {
  try {
    localStorage.removeItem(cacheKey(widgetId));
  } catch {
    // See writeCachedWidget.
  }
};
