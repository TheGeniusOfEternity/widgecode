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
  getWidget,
  listWidgets,
  previewWidgetBlock,
  updateBlockLayouts,
  updateBlock,
  updateWidget,
} from '@/shared/api/widgets';
export type { CreateWidgetInput } from '@/shared/api/widgets';
