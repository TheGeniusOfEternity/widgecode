import { apiClient } from '@/shared/api/client';
import type {
  BlockType,
  BlockLayout,
  PublicWidgetResponse,
  RenderedBlock,
  SourceType,
  Widget,
  WidgetBlock,
  WidgetConfig,
} from '@/entities/widget/model/types';

export type CreateWidgetInput = {
  title: string;
  source: SourceType;
  username?: string;
  presetId?: string;
};

export const listWidgets = async () => {
  const response = await apiClient<{ widgets: Widget[] }>('/widgets');
  return response.widgets;
};

export const getWidget = async (id: string) => {
  const response = await apiClient<{ widget: Widget }>(`/widgets/${id}`);
  return response.widget;
};

export const createWidget = async (input: CreateWidgetInput) => {
  const response = await apiClient<{ widget: Widget }>('/widgets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.widget;
};

export const updateWidget = async (
  id: string,
  input: {
    title?: string;
    width?: number;
    height?: number;
    public?: boolean;
    config?: Partial<WidgetConfig>;
  },
) => {
  const response = await apiClient<{ widget: Widget }>(`/widgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return response.widget;
};

export const deleteWidget = (id: string) => apiClient<void>(`/widgets/${id}`, { method: 'DELETE' });

export const addBlock = async (
  widgetId: string,
  type: BlockType,
  config: Record<string, unknown>,
) => {
  const response = await apiClient<{ block: WidgetBlock }>(`/widgets/${widgetId}/blocks`, {
    method: 'POST',
    body: JSON.stringify({ type, config }),
  });
  return response.block;
};

export const updateBlock = async (id: string, config: Record<string, unknown>) => {
  const response = await apiClient<{ block: WidgetBlock }>(`/blocks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ config }),
  });
  return response.block;
};

export const previewWidgetBlock = async (
  widgetId: string,
  block: Pick<WidgetBlock, 'id' | 'type' | 'config'>,
) => {
  const response = await apiClient<{ block: RenderedBlock }>(`/widgets/${widgetId}/preview`, {
    method: 'POST',
    body: JSON.stringify(block),
  });
  return response.block;
};

export const deleteBlock = (id: string) => apiClient<void>(`/blocks/${id}`, { method: 'DELETE' });

export const updateBlockLayouts = async (
  widgetId: string,
  layouts: { blockId: string; layout: BlockLayout }[],
  columns?: number,
) => {
  const response = await apiClient<{ widget: Widget }>(`/widgets/${widgetId}/blocks`, {
    method: 'PUT',
    body: JSON.stringify({ layouts, columns }),
  });
  return response.widget;
};

export const getPublicWidget = async (slug: string) =>
  apiClient<PublicWidgetResponse>(`/public/widgets/${encodeURIComponent(slug)}`, {
    skipAuthRefresh: true,
  });

export const getPublicWidgetUrl = (slug: string, embed = false) =>
  `${window.location.origin}/w/${encodeURIComponent(slug)}${embed ? '?embed=1' : ''}`;
