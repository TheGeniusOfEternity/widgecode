export {
  API_BASE_URL,
  ApiError,
  apiClient,
  configureApiAuth,
  getApiErrorMessage,
} from '@/shared/api/client';
export {
  addBlock,
  createWidget,
  deleteBlock,
  deleteWidget,
  getPublicWidget,
  getPublicWidgetPath,
  getPublicWidgetUrl,
  PUBLIC_WIDGET_MESSAGE_SOURCE,
  getWidget,
  listWidgets,
  previewWidgetBlock,
  updateBlockLayouts,
  updateBlock,
  updateWidget,
} from '@/shared/api/widgets';
export type { CreateWidgetInput, PublicWidgetDimensions } from '@/shared/api/widgets';
