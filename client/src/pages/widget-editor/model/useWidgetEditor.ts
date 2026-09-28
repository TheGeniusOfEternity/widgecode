import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { defaultBlockConfig, type BlockType, type Widget } from '@/entities/widget/model';
import {
  addBlock,
  deleteBlock,
  getWidget,
  updateBlock,
  updateBlockLayouts,
  updateWidget,
} from '@/shared/api';
import {
  clearCachedWidget,
  readCachedWidget,
  writeCachedWidget,
} from '@/pages/widget-editor/model/editorCache';
import {
  MAX_BLOCKS,
  MAX_COLUMNS,
  getWidgetDimensions,
  layoutsFor,
  normalizeWidget,
} from '@/pages/widget-editor/model/layout';

export type EditorPanel = 'widget' | 'block';

const AUTOSAVE_DELAY_MS = 1500;

type Messages = { unavailable: string; blocksLimit: string };

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Editor state: loads the widget, applies local edits, and saves them with debounced autosave.
 * Edits made while a save is in flight bump `editVersion`, so the save result doesn't overwrite
 * them and the widget stays dirty for the next save.
 */
export const useWidgetEditor = ({
  widgetId,
  enabled,
  messages,
  onSave,
}: {
  widgetId: string;
  enabled: boolean;
  messages: Messages;
  onSave?: (widget: Widget) => void;
}) => {
  const [widget, setWidget] = useState<Widget | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<EditorPanel>('widget');
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [isDirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<Widget | null>(null);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const editVersionRef = useRef(0);
  const isDirtyRef = useRef(false);

  const markSaved = (saved: Widget) => {
    widgetRef.current = saved;
    setWidget(saved);
    isDirtyRef.current = false;
    setDirty(false);
    clearCachedWidget(saved.id);
  };

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void getWidget(widgetId)
      .then((serverWidget) => {
        if (cancelled) return;
        const cachedWidget = readCachedWidget(widgetId);
        const normalized = normalizeWidget(cachedWidget ?? serverWidget);
        setWidget(normalized.widget);
        widgetRef.current = normalized.widget;
        setSelectedBlockId(normalized.widget.blocks[0]?.id ?? null);
        const nextIsDirty = Boolean(cachedWidget) || normalized.changed;
        editVersionRef.current = 0;
        isDirtyRef.current = nextIsDirty;
        setDirty(nextIsDirty);
      })
      .catch((loadError) => {
        if (!cancelled) setError(errorMessage(loadError, messages.unavailable));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, messages.unavailable, widgetId]);

  useEffect(() => {
    widgetRef.current = widget;
    isDirtyRef.current = isDirty;
    if (widget && isDirty) writeCachedWidget(widget);
  }, [isDirty, widget]);

  const updateLocalWidget = (updater: (current: Widget) => Widget) => {
    const current = widgetRef.current;
    if (!current) return;
    const nextWidget = updater(current);
    const sizedWidget = { ...nextWidget, ...getWidgetDimensions(nextWidget.blocks) };
    widgetRef.current = sizedWidget;
    setWidget(sizedWidget);
    editVersionRef.current += 1;
    isDirtyRef.current = true;
    setDirty(true);
  };

  const save = async (publish = false): Promise<void> => {
    if (savePromiseRef.current) {
      await savePromiseRef.current;
      if (publish || isDirtyRef.current) return save(publish);
    }
    const run = (async () => {
      const current = widgetRef.current;
      if (!current) return;
      const saveVersion = editVersionRef.current;
      setSaving(true);
      setError(null);
      try {
        await updateBlockLayouts(current.id, layoutsFor(current), current.config.grid.columns);
        await Promise.all(current.blocks.map((block) => updateBlock(block.id, block.config)));
        const saved = await updateWidget(current.id, {
          title: current.title,
          public: publish || current.public,
          config: current.config,
        });
        const normalized = normalizeWidget(saved).widget;
        if (editVersionRef.current === saveVersion) {
          markSaved(normalized);
        } else {
          isDirtyRef.current = true;
          setDirty(true);
        }
        onSave?.(normalized);
      } catch (saveError) {
        setError(errorMessage(saveError, messages.unavailable));
      } finally {
        setSaving(false);
      }
    })();
    savePromiseRef.current = run.finally(() => {
      savePromiseRef.current = null;
    });
    return savePromiseRef.current;
  };

  const triggerAutosave = useEffectEvent(() => {
    void save();
  });

  const flushPendingSave = useEffectEvent(() => {
    if (isDirtyRef.current) void save();
  });

  useEffect(() => {
    if (!widget || !isDirty) return;
    const timeout = window.setTimeout(triggerAutosave, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [isDirty, widget]);

  useEffect(() => {
    if (!widget) return;
    window.addEventListener('pagehide', flushPendingSave);
    return () => window.removeEventListener('pagehide', flushPendingSave);
  }, [widget]);

  useEffect(() => () => flushPendingSave(), []);

  const unpublish = async () => {
    if (!widgetRef.current) return;
    setSaving(true);
    try {
      await save();
      const current = widgetRef.current;
      if (!current) return;
      markSaved(normalizeWidget(await updateWidget(current.id, { public: false })).widget);
    } catch (saveError) {
      setError(errorMessage(saveError, messages.unavailable));
    } finally {
      setSaving(false);
    }
  };

  const selectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    setActivePanel('block');
  };

  const addBlockOfType = async (type: BlockType) => {
    const current = widgetRef.current;
    if (!current) return;
    if (current.blocks.length >= MAX_BLOCKS) {
      setError(messages.blocksLimit);
      return;
    }
    try {
      const block = await addBlock(current.id, type, defaultBlockConfig(type));
      updateLocalWidget((latest) => ({
        ...latest,
        config: { ...latest.config, grid: { columns: MAX_COLUMNS } },
        blocks: [...latest.blocks, block],
      }));
      selectBlock(block.id);
    } catch (addError) {
      setError(errorMessage(addError, messages.unavailable));
    }
  };

  const removeBlock = async (blockId: string) => {
    if (!widgetRef.current) return;
    try {
      await deleteBlock(blockId);
      updateLocalWidget((latest) => ({
        ...latest,
        config: { ...latest.config, grid: { columns: MAX_COLUMNS } },
        blocks: latest.blocks.filter((block) => block.id !== blockId),
      }));
      setSelectedBlockId((selected) => (selected === blockId ? null : selected));
      setActivePanel('widget');
    } catch (removeError) {
      setError(errorMessage(removeError, messages.unavailable));
    }
  };

  const updateBlockConfig = (blockId: string, patch: Record<string, unknown>) => {
    updateLocalWidget((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, config: { ...block.config, ...patch } } : block,
      ),
    }));
  };

  return {
    widget,
    widgetRef,
    selectedBlock: widget?.blocks.find((block) => block.id === selectedBlockId) ?? null,
    activePanel,
    setActivePanel,
    selectBlock,
    isLoading,
    isSaving,
    isDirty,
    isDirtyRef,
    error,
    updateLocalWidget,
    save,
    unpublish,
    addBlock: addBlockOfType,
    removeBlock,
    updateBlockConfig,
  };
};
