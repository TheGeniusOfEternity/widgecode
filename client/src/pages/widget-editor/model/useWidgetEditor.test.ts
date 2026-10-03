import { act, renderHook, waitFor } from '@testing-library/react';

import type { Widget } from '@/entities/widget/model';
import { useWidgetEditor } from '@/pages/widget-editor/model/useWidgetEditor';

const api = vi.hoisted(() => ({
  getWidget: vi.fn(),
  updateBlockLayouts: vi.fn(),
  updateBlock: vi.fn(),
  updateWidget: vi.fn(),
  addBlock: vi.fn(),
  deleteBlock: vi.fn(),
}));

vi.mock('@/shared/api', () => api);

const serverWidget: Widget = {
  id: 'widget-1',
  title: 'Widget',
  slug: 'widget',
  width: 600,
  height: 318,
  public: false,
  createdAt: '',
  updatedAt: '',
  config: {
    palette: 'lavender',
    paletteMode: 'light',
    grid: { columns: 4 },
    renderFormat: 'iframe',
  },
  blocks: [
    {
      id: 'block-1',
      type: 'text',
      position: 0,
      config: { text: 'Hello', layout: { x: 0, y: 0, width: 2, height: 2 } },
    },
  ],
};

const messages = { unavailable: 'Unavailable', blocksLimit: 'Too many blocks' };

const renderEditor = async () => {
  const hook = renderHook(() =>
    useWidgetEditor({ widgetId: serverWidget.id, enabled: true, messages }),
  );
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  api.getWidget.mockResolvedValue(serverWidget);
  api.updateBlockLayouts.mockResolvedValue(serverWidget);
  api.updateBlock.mockResolvedValue({});
  api.updateWidget.mockImplementation(async (_id: string, input: Partial<Widget>) => ({
    ...serverWidget,
    ...input,
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

it('loads a normalized widget and selects its first block', async () => {
  const { result } = await renderEditor();

  expect(result.current.widget?.title).toBe('Widget');
  expect(result.current.selectedBlock?.id).toBe('block-1');
  expect(result.current.isDirty).toBe(false);
});

it('autosaves local edits after the debounce and clears the dirty flag', async () => {
  const { result } = await renderEditor();
  vi.useFakeTimers();

  act(() => result.current.updateLocalWidget((widget) => ({ ...widget, title: 'Renamed' })));
  expect(result.current.isDirty).toBe(true);
  expect(localStorage.length).toBe(1);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500);
  });

  expect(api.updateWidget).toHaveBeenCalledWith(
    'widget-1',
    expect.objectContaining({ title: 'Renamed' }),
  );
  expect(result.current.isDirty).toBe(false);
  expect(localStorage.length).toBe(0);
});

it('keeps edits made while a save is in flight', async () => {
  const { result } = await renderEditor();
  let finishSave: () => void = () => {};
  api.updateBlockLayouts.mockImplementationOnce(
    () => new Promise((resolve) => (finishSave = () => resolve(serverWidget))),
  );

  act(() => result.current.updateLocalWidget((widget) => ({ ...widget, title: 'First' })));
  let saving: Promise<void> = Promise.resolve();
  act(() => {
    saving = result.current.save();
  });
  act(() => result.current.updateLocalWidget((widget) => ({ ...widget, title: 'Second' })));
  await act(async () => {
    finishSave();
    await saving;
  });

  expect(result.current.widget?.title).toBe('Second');
  expect(result.current.isDirty).toBe(true);
});

it('restores unsaved edits from the local cache', async () => {
  localStorage.setItem(
    'widget-editor:v5:widget-1',
    JSON.stringify({ savedAt: 1, widget: { ...serverWidget, title: 'Unsaved' } }),
  );

  const { result } = await renderEditor();

  expect(result.current.widget?.title).toBe('Unsaved');
  expect(result.current.isDirty).toBe(true);
});

it('refuses to add blocks past the limit', async () => {
  api.getWidget.mockResolvedValue({
    ...serverWidget,
    blocks: Array.from({ length: 8 }, (_, index) => ({
      ...serverWidget.blocks[0],
      id: `block-${index}`,
      position: index,
      config: {
        text: 'x',
        layout: { x: index % 4, y: Math.floor(index / 4), width: 1, height: 1 },
      },
    })),
  });
  const { result } = await renderEditor();

  await act(() => result.current.addBlock('text'));

  expect(api.addBlock).not.toHaveBeenCalled();
  expect(result.current.error).toBe('Too many blocks');
});
