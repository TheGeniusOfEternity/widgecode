import { ArrowLeft, Check, Copy, Eye, Grip, Plus, TrashBin } from '@gravity-ui/icons';
import { Button, Checkbox, Icon, Select, TextArea, TextInput } from '@gravity-ui/uikit';
import GridLayout, { type Layout, type LayoutItem, WidthProvider } from 'react-grid-layout/legacy';
import type { EventCallback } from 'react-grid-layout';
import { flushSync } from 'react-dom';
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type Ref } from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { WidgetBlockContent } from '@/entities/widget';
import {
  addBlock,
  deleteBlock,
  getWidget,
  updateBlock,
  updateBlockLayouts,
  updateWidget,
} from '@/shared/api';
import {
  blockDefinitions,
  defaultBlockConfig,
  paletteTokens,
  palettes,
  type BlockLayout,
  type BlockType,
  type PaletteMode,
  type SourceType,
  type Widget,
  type WidgetBlock,
} from '@/entities/widget/model';
import { messages, type Locale } from '@/shared/locale/content';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';
import canvasStyles from '@/entities/widget/ui/WidgetCanvas.module.css';

const MAX_BLOCKS = 5;
const MAX_COLUMNS = 2;
const GRID_ROW_HEIGHT = 112;
const DEFAULT_LAYOUT: BlockLayout = { x: 0, y: 0, width: 2, height: 1 };
const EditorGridLayout = WidthProvider(GridLayout);

type WidgetEditorPageProps = {
  widgetId: string;
  locale: Locale;
  onBack: () => void;
  onOpenPublic: (slug: string) => void;
};

type CachedEditorState = { savedAt: number; widget: Widget };
type Panel = 'widget' | 'block';

const cacheKey = (widgetId: string) => `widget-editor:v2:${widgetId}`;

const readCachedWidget = (widgetId: string): Widget | null => {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(widgetId)) ?? '') as CachedEditorState;
    return cached.widget;
  } catch {
    return null;
  }
};

const writeCachedWidget = (widget: Widget) => {
  localStorage.setItem(
    cacheKey(widget.id),
    JSON.stringify({ savedAt: Date.now(), widget } satisfies CachedEditorState),
  );
};

const clearCachedWidget = (widgetId: string) => localStorage.removeItem(cacheKey(widgetId));

const sourceForBlock = (type: BlockType): SourceType | null => {
  if (type.startsWith('github')) return 'github';
  if (type.startsWith('leetcode')) return 'leetcode';
  return null;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const layoutFromBlock = (block: WidgetBlock, index: number, columns: number): BlockLayout => {
  const input = block.config.layout;
  const value =
    input && typeof input === 'object' ? (input as Partial<BlockLayout>) : DEFAULT_LAYOUT;
  const x = clamp(typeof value.x === 'number' ? value.x : 0, 0, Math.max(columns - 1, 0));
  const width = clamp(typeof value.width === 'number' ? value.width : 1, 1, columns - x);
  return {
    x,
    y: clamp(typeof value.y === 'number' ? value.y : index, 0, 100),
    width,
    height: clamp(typeof value.height === 'number' ? value.height : 1, 1, 2),
  };
};

const normalizeWidget = (widget: Widget) => {
  const columns = clamp(widget.config?.grid?.columns ?? 1, 1, MAX_COLUMNS);
  const legacySources = widget.config?.sources ?? {};
  let changed = !widget.config?.grid || !widget.config?.paletteMode;
  const blocks = [...widget.blocks]
    .sort((left, right) => left.position - right.position)
    .map((block, index) => {
      const layout = layoutFromBlock(block, index, columns);
      const source = sourceForBlock(block.type);
      const currentUsername =
        typeof block.config.username === 'string' ? block.config.username : '';
      const legacyUsername = source ? legacySources[source]?.username : undefined;
      const username = currentUsername || legacyUsername;
      if (!block.config.layout || (source && !currentUsername && legacyUsername)) changed = true;
      return {
        ...block,
        position: index,
        config: {
          ...block.config,
          ...(source && username ? { username } : {}),
          layout,
        },
      };
    });

  return {
    widget: {
      ...widget,
      config: {
        ...widget.config,
        palette: widget.config?.palette ?? 'lavender',
        paletteMode: widget.config?.paletteMode ?? 'auto',
        grid: { columns },
        renderFormat: 'iframe' as const,
      },
      blocks,
    },
    changed,
  };
};

const getLayout = (block: WidgetBlock): BlockLayout => {
  const value = block.config.layout;
  return value && typeof value === 'object' ? (value as BlockLayout) : DEFAULT_LAYOUT;
};

const layoutsFor = (widget: Widget) =>
  widget.blocks.map((block) => ({ blockId: block.id, layout: getLayout(block) }));

const columnsForLayout = (layout: Layout) =>
  clamp(
    layout.reduce((max, item) => Math.max(max, item.x + item.w), 1),
    1,
    MAX_COLUMNS,
  );

const rglLayoutFor = (widget: Widget): Layout =>
  widget.blocks.map((block) => {
    const layout = getLayout(block);
    return {
      i: block.id,
      x: layout.x,
      y: layout.y,
      w: layout.width,
      h: layout.height,
      minW: 1,
      minH: 1,
      maxW: MAX_COLUMNS,
      maxH: 2,
    } satisfies LayoutItem;
  });

const widgetWithRglLayout = (widget: Widget, layout: Layout) => {
  const domainLayout = layout.map((item) => {
    let width = clamp(Math.round(item.w), 1, MAX_COLUMNS);
    let height = clamp(Math.round(item.h), 1, 2);
    if (width === 1 && height === 2) {
      width = 2;
      height = 2;
    }
    const x = clamp(Math.round(item.x), 0, MAX_COLUMNS - width);
    return {
      i: item.i,
      x,
      y: clamp(Math.round(item.y), 0, 100),
      w: width,
      h: height,
    };
  });
  const byId = new Map(domainLayout.map((item) => [item.i, item]));
  const nextColumns = columnsForLayout(domainLayout);
  return {
    ...widget,
    config: { ...widget.config, grid: { columns: nextColumns } },
    blocks: widget.blocks.map((block) => {
      const item = byId.get(block.id);
      if (!item) return block;
      return {
        ...block,
        config: {
          ...block.config,
          layout: {
            x: item.x,
            y: item.y,
            width: item.w,
            height: item.h,
          },
        },
      };
    }),
  } satisfies Widget;
};

const layoutEquals = (left: Layout, right: Layout) =>
  left.length === right.length &&
  left.every((item) => {
    const other = right.find((candidate) => candidate.i === item.i);
    return (
      other && item.x === other.x && item.y === other.y && item.w === other.w && item.h === other.h
    );
  });

const EditorBlock = ({
  block,
  selected,
  onSelect,
  onRemove,
  removeLabel,
}: {
  block: WidgetBlock;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  removeLabel: string;
}) => {
  return (
    <article
      className={`${canvasStyles.block} ${styles.sortableBlock} ${selected ? canvasStyles.selected : ''}`}
      data-block-id={block.id}
      onClick={onSelect}
    >
      <button
        className={`${styles.dragHandle} widget-drag-handle`}
        type="button"
        aria-label="Move block"
      >
        <Icon data={Grip} size={16} />
      </button>
      <WidgetBlockContent block={block} />
      <button
        className={styles.removeBlock}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        aria-label={removeLabel}
      >
        <Icon data={TrashBin} size={15} />
      </button>
    </article>
  );
};

export const WidgetEditorPage = ({
  widgetId,
  locale,
  onBack,
  onOpenPublic,
}: WidgetEditorPageProps) => {
  const t = messages[locale];
  const [widget, setWidget] = useState<Widget | null>(null);
  const widgetRef = useRef<Widget | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>('widget');
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [isDirty, setDirty] = useState(false);
  const [isCopied, setCopied] = useState(false);
  const [isMobile, setMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savePromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getWidget(widgetId)
      .then((serverWidget) => {
        if (cancelled) return;
        const cachedWidget = readCachedWidget(widgetId);
        const normalized = normalizeWidget(cachedWidget ?? serverWidget);
        setWidget(normalized.widget);
        widgetRef.current = normalized.widget;
        setSelectedBlockId(normalized.widget.blocks[0]?.id ?? null);
        setDirty(Boolean(cachedWidget) || normalized.changed);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : t.unavailable);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t.unavailable, widgetId]);

  useEffect(() => {
    widgetRef.current = widget;
    if (widget && isDirty) writeCachedWidget(widget);
  }, [isDirty, widget]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const updateLocalWidget = (updater: (current: Widget) => Widget) => {
    const current = widgetRef.current;
    if (!current) return;
    const nextWidget = updater(current);
    widgetRef.current = nextWidget;
    setWidget(nextWidget);
    setDirty(true);
  };

  const selectedBlock = widget?.blocks.find((block) => block.id === selectedBlockId) ?? null;

  const prepareDrag = (blockId: string) => {
    const current = widgetRef.current;
    if (!current) return;
    const shouldSquareBlocks =
      current.blocks.length > 1 &&
      current.blocks.some((block) => {
        const layout = getLayout(block);
        return layout.width === 2 && layout.height === 1;
      });
    if (!shouldSquareBlocks) return;
    const nextWidget = {
      ...current,
      config: { ...current.config, grid: { columns: 1 } },
      blocks: current.blocks.map((block) => {
        const layout = getLayout(block);
        return layout.width === 2 && layout.height === 1
          ? { ...block, config: { ...block.config, layout: { ...layout, width: 1 } } }
          : block;
      }),
    };
    widgetRef.current = nextWidget;
    setWidget(nextWidget);
    setDirty(true);
    setSelectedBlockId(blockId);
    setActivePanel('block');
  };

  const updateGridState = (nextLayout: Layout) => {
    const current = widgetRef.current;
    if (!current || layoutEquals(rglLayoutFor(current), nextLayout)) return;
    const nextWidget = widgetWithRglLayout(current, nextLayout);
    widgetRef.current = nextWidget;
    setWidget(nextWidget);
    setDirty(true);
  };

  const handleGridLayoutChange = (nextLayout: Layout) => {
    if (isMobile) return;
    updateGridState(nextLayout);
  };

  const handleGridInteractionStart: EventCallback = (_layout, _oldItem, newItem) => {
    if (newItem) {
      setSelectedBlockId(newItem.i);
      setActivePanel('block');
    }
  };

  const handleGridInteractionStop: EventCallback = (nextLayout) => {
    if (!isMobile) updateGridState(nextLayout);
  };

  const handleAddBlock = async (type: BlockType) => {
    const current = widgetRef.current;
    if (!current) return;
    if (current.blocks.length >= MAX_BLOCKS) {
      setError(t.blocksLimit);
      return;
    }
    try {
      const block = await addBlock(current.id, type, defaultBlockConfig(type));
      const nextWidget = {
        ...current,
        config: {
          ...current.config,
          grid: {
            columns: Math.max(
              current.config.grid.columns,
              getLayout(block).x + getLayout(block).width,
            ),
          },
        },
        blocks: [...current.blocks, block],
      };
      updateLocalWidget(() => nextWidget);
      setSelectedBlockId(block.id);
      setActivePanel('block');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : t.unavailable);
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    const current = widgetRef.current;
    if (!current) return;
    try {
      await deleteBlock(blockId);
      const blocks = current.blocks.filter((block) => block.id !== blockId);
      const remainingLayout = blocks.map((block) => {
        const layout = getLayout(block);
        return { i: block.id, x: layout.x, y: layout.y, w: layout.width, h: layout.height };
      });
      const nextWidget = {
        ...current,
        config: { ...current.config, grid: { columns: columnsForLayout(remainingLayout) } },
        blocks,
      };
      updateLocalWidget(() => nextWidget);
      setSelectedBlockId((current) => (current === blockId ? null : current));
      setActivePanel('widget');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : t.unavailable);
    }
  };

  const handleBlockConfig = (patch: Record<string, unknown>) => {
    if (!widget || !selectedBlock) return;
    const config = { ...selectedBlock.config, ...patch };
    updateLocalWidget((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === selectedBlock.id ? { ...block, config } : block,
      ),
    }));
  };

  const handleSave = (publish = false): Promise<void> => {
    if (savePromiseRef.current) {
      const pending = savePromiseRef.current;
      return pending.then(() => (publish ? handleSave(true) : undefined));
    }
    const run = (async () => {
      const current = widgetRef.current;
      if (!current) return;
      setSaving(true);
      setError(null);
      try {
        await updateBlockLayouts(current.id, layoutsFor(current), current.config.grid.columns);
        await Promise.all(current.blocks.map((block) => updateBlock(block.id, block.config)));
        const saved = await updateWidget(current.id, {
          title: current.title,
          width: current.width,
          height: current.height,
          public: publish || current.public,
          config: current.config,
        });
        const normalized = normalizeWidget(saved).widget;
        widgetRef.current = normalized;
        setWidget(normalized);
        setDirty(false);
        clearCachedWidget(current.id);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : t.unavailable);
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
    void handleSave();
  });

  useEffect(() => {
    if (!widget || !isDirty) return;
    const timeout = window.setTimeout(triggerAutosave, 850);
    return () => window.clearTimeout(timeout);
  }, [isDirty, widget?.id, widget]);

  const handleUnpublish = async () => {
    if (!widget) return;
    setSaving(true);
    try {
      await handleSave();
      const current = widgetRef.current;
      if (!current) return;
      const saved = await updateWidget(current.id, { public: false });
      const normalized = normalizeWidget(saved).widget;
      widgetRef.current = normalized;
      setWidget(normalized);
      setDirty(false);
      clearCachedWidget(current.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t.unavailable);
    } finally {
      setSaving(false);
    }
  };

  const copyEmbed = async () => {
    if (!widget || !widget.public) return;
    const src = `${window.location.origin}/w/${widget.slug}`;
    const code = `<iframe src="${src}" width="${widget.width}" height="${widget.height}" frameborder="0" loading="lazy"></iframe>`;
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const guardLeave = () => {
    onBack();
  };

  if (isLoading) return <div className={styles.status}>{t.loading}</div>;
  if (!widget)
    return (
      <div className={styles.status} role="alert">
        {error || t.unavailable}
      </div>
    );

  const columns = widget.config.grid.columns;
  const gridColumns = isMobile ? 1 : MAX_COLUMNS;
  const gridLayout = isMobile
    ? widget.blocks.map((block, index) => {
        const layout = getLayout(block);
        return {
          i: block.id,
          x: 0,
          y: index,
          w: 1,
          h: layout.height,
        } satisfies LayoutItem;
      })
    : rglLayoutFor(widget);
  const palette = paletteTokens[widget.config.palette];
  const canvasStyle = {
    '--widget-light-accent': palette.light.accent,
    '--widget-light-soft': palette.light.soft,
    '--widget-light-ink': palette.light.ink,
    '--widget-light-surface': palette.light.surface,
    '--widget-dark-accent': palette.dark.accent,
    '--widget-dark-soft': palette.dark.soft,
    '--widget-dark-ink': palette.dark.ink,
    '--widget-dark-surface': palette.dark.surface,
    '--widget-columns': gridColumns,
  } as CSSProperties;

  return (
    <section className={styles.editorPage}>
      <header className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <Button view="flat" onClick={guardLeave} aria-label={t.back}>
            <Icon data={ArrowLeft} size={18} />
          </Button>
          <div>
            <p>{t.widgetSettings}</p>
            <h1>{widget.title}</h1>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={isDirty ? styles.unsavedStatus : styles.savedStatus}>
            {isDirty ? t.unsaved : t.saved}
          </span>
          {widget.public && (
            <Button view="outlined" onClick={() => onOpenPublic(widget.slug)}>
              <Icon data={Eye} size={17} />
              {t.open}
            </Button>
          )}
          {widget.public && (
            <Button view="outlined-action" onClick={copyEmbed}>
              <Icon data={isCopied ? Check : Copy} size={17} />
              {isCopied ? t.copied : t.copy}
            </Button>
          )}
          {!widget.public && (
            <Button view="outlined-action" onClick={() => void handleSave(true)} loading={isSaving}>
              {t.publish}
            </Button>
          )}
        </div>
      </header>

      <div className={styles.editorGrid}>
        <aside className={styles.leftPanel}>
          <div className={styles.panelHeading}>
            <div>
              <p>{t.blockLibrary}</p>
              <h2>{t.addBlock}</h2>
            </div>
            <span className={styles.blockCount}>
              {widget.blocks.length}/{MAX_BLOCKS}
            </span>
          </div>
          <div className={styles.library}>
            {blockDefinitions.map((definition) => (
              <button
                type="button"
                className={styles.libraryItem}
                key={definition.type}
                onClick={() => void handleAddBlock(definition.type)}
                disabled={widget.blocks.length >= MAX_BLOCKS}
              >
                <span className={styles.libraryGlyph}>
                  {definition.type === 'text'
                    ? 'T'
                    : definition.type.startsWith('github')
                      ? 'GH'
                      : 'LC'}
                </span>
                <span>
                  <strong>{definition.label}</strong>
                  <small>{definition.description}</small>
                </span>
                <Icon data={Plus} size={15} />
              </button>
            ))}
          </div>
          <div className={styles.panelHint}>{t.moveResize}</div>
        </aside>

        <main className={styles.canvasArea}>
          <div className={styles.canvasMeta}>
            <span>canvas / {widget.slug}</span>
            <span>
              {columns} {t.columns.toLowerCase()} · {widget.width} × {widget.height}
            </span>
          </div>
          <div
            className={styles.gridSurface}
            style={canvasStyle}
            data-palette-mode={widget.config.paletteMode}
          >
            <div className={canvasStyles.canvasHeader}>
              <span className={canvasStyles.brandDot} />
              <span>live widget preview</span>
            </div>
            {widget.blocks.length === 0 ? (
              <p className={canvasStyles.empty}>
                {locale === 'ru'
                  ? 'Добавьте первый блок слева.'
                  : 'Add your first block from the library.'}
              </p>
            ) : (
              <div
                className={styles.gridLayoutHost}
                onMouseDownCapture={(event) => {
                  const target = event.target;
                  if (target instanceof Element && target.closest('.widget-drag-handle')) {
                    const block = target.closest<HTMLElement>('[data-block-id]');
                    const blockId = block?.dataset.blockId;
                    if (blockId) flushSync(() => prepareDrag(blockId));
                  }
                }}
              >
                <EditorGridLayout
                  className={styles.editorBlocks}
                  cols={gridColumns}
                  layout={gridLayout}
                  rowHeight={GRID_ROW_HEIGHT}
                  maxRows={100}
                  margin={[18, 18]}
                  containerPadding={[0, 0]}
                  compactType={null}
                  preventCollision
                  isBounded
                  draggableHandle=".widget-drag-handle"
                  draggableCancel="input, textarea, select, .removeBlock"
                  resizeHandles={['se']}
                  resizeHandle={(axis, ref) => (
                    <span
                      ref={ref as Ref<HTMLSpanElement>}
                      className={`react-resizable-handle react-resizable-handle-${axis} ${styles.resizeHandle}`}
                      aria-label={t.resize}
                    />
                  )}
                  onLayoutChange={handleGridLayoutChange}
                  onDragStart={handleGridInteractionStart}
                  onDragStop={handleGridInteractionStop}
                  onResizeStart={handleGridInteractionStart}
                  onResizeStop={handleGridInteractionStop}
                >
                  {widget.blocks.map((block) => (
                    <EditorBlock
                      key={block.id}
                      block={block}
                      selected={block.id === selectedBlockId}
                      onSelect={() => {
                        setSelectedBlockId(block.id);
                        setActivePanel('block');
                      }}
                      onRemove={() => void handleRemoveBlock(block.id)}
                      removeLabel={t.removeBlock}
                    />
                  ))}
                </EditorGridLayout>
              </div>
            )}
            <div className={`${canvasStyles.canvasFooter} ${styles.canvasFooter}`}>
              <span>
                {widget.blocks.length} {t.blocks.toLowerCase()}
              </span>
              <span>updates every 15 min</span>
            </div>
          </div>
          {error && (
            <p className={styles.inlineError} role="alert">
              {error}
            </p>
          )}
        </main>

        <aside className={styles.rightPanel}>
          <div className={styles.panelTabs} role="tablist">
            <button
              type="button"
              className={activePanel === 'widget' ? styles.panelTabActive : styles.panelTab}
              onClick={() => setActivePanel('widget')}
            >
              {t.widgetTab}
            </button>
            <button
              type="button"
              className={activePanel === 'block' ? styles.panelTabActive : styles.panelTab}
              onClick={() => setActivePanel('block')}
              disabled={!selectedBlock}
            >
              {t.blockTab}
            </button>
          </div>
          {activePanel === 'widget' ? (
            <WidgetConfigPanel widget={widget} locale={locale} onChange={updateLocalWidget} />
          ) : selectedBlock ? (
            <BlockConfigPanel
              block={selectedBlock}
              locale={locale}
              onChange={(patch) => void handleBlockConfig(patch)}
            />
          ) : (
            <p className={styles.muted}>{t.selectBlock}</p>
          )}
          {widget.public && (
            <section className={styles.publishSection}>
              <div>
                <span className={styles.publishedDot} />
                {t.published}
              </div>
              <Button view="outlined" onClick={() => void handleUnpublish()} loading={isSaving}>
                {t.unpublish}
              </Button>
              <div className={styles.publicUrl}>/w/{widget.slug}</div>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
};

const WidgetConfigPanel = ({
  widget,
  locale,
  onChange,
}: {
  widget: Widget;
  locale: Locale;
  onChange: (updater: (current: Widget) => Widget) => void;
}) => {
  const t = messages[locale];
  return (
    <section className={styles.settingsSection}>
      <div className={styles.panelHeading}>
        <div>
          <p>{t.widgetSettings}</p>
          <h2>{t.settings}</h2>
        </div>
      </div>
      <label className={styles.field}>
        <span>{t.widgetName}</span>
        <TextInput
          size="l"
          value={widget.title}
          onUpdate={(value) => onChange((current) => ({ ...current, title: value }))}
        />
      </label>
      <div className={styles.twoFields}>
        <label className={styles.field}>
          <span>{t.width}</span>
          <TextInput
            size="l"
            type="number"
            value={String(widget.width)}
            onUpdate={(value) =>
              onChange((current) => ({
                ...current,
                width: clamp(Number(value), 280, 1600),
              }))
            }
          />
        </label>
        <label className={styles.field}>
          <span>{t.height}</span>
          <TextInput
            size="l"
            type="number"
            value={String(widget.height)}
            onUpdate={(value) =>
              onChange((current) => ({
                ...current,
                height: clamp(Number(value), 160, 1200),
              }))
            }
          />
        </label>
      </div>
      <div className={styles.gridInfo}>
        <span>{t.columns}</span>
        <strong>{widget.config.grid.columns} / 2</strong>
        <small>
          {locale === 'ru'
            ? 'Колонки появляются при переносе блока вправо.'
            : 'Columns appear when a block is moved to the right.'}
        </small>
      </div>
      <div className={styles.modeField}>
        <span>{t.palette}</span>
        <div className={styles.modeOptions}>
          {(['light', 'dark', 'auto'] as PaletteMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={widget.config.paletteMode === mode ? styles.modeActive : styles.modeButton}
              onClick={() =>
                onChange((current) => ({
                  ...current,
                  config: { ...current.config, paletteMode: mode },
                }))
              }
            >
              {mode === 'light' ? t.light : mode === 'dark' ? t.dark : t.auto}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.paletteGrid}>
        {palettes.map((palette) => (
          <button
            type="button"
            key={palette.id}
            className={`${styles.palette} ${widget.config.palette === palette.id ? styles.paletteSelected : ''}`}
            onClick={() =>
              onChange((current) => ({
                ...current,
                config: { ...current.config, palette: palette.id },
              }))
            }
          >
            <span>
              {palette.colors.map((color) => (
                <i key={color} style={{ background: color }} />
              ))}
            </span>
            <small>{palette.label}</small>
          </button>
        ))}
      </div>
    </section>
  );
};

const BlockConfigPanel = ({
  block,
  locale,
  onChange,
}: {
  block: WidgetBlock;
  locale: Locale;
  onChange: (patch: Record<string, unknown>) => void;
}) => {
  const t = messages[locale];
  const source = sourceForBlock(block.type);
  const options =
    block.type === 'github-stats'
      ? [
          ['showRepositories', locale === 'ru' ? 'Репозитории' : 'Repositories'],
          ['showFollowers', locale === 'ru' ? 'Подписчики' : 'Followers'],
          ['showFollowing', locale === 'ru' ? 'Подписки' : 'Following'],
        ]
      : block.type === 'leetcode-stats'
        ? [
            ['showRanking', locale === 'ru' ? 'Рейтинг' : 'Ranking'],
            ['showContestRating', 'Contest rating'],
          ]
        : [];
  return (
    <section className={styles.settingsSection}>
      <div className={styles.panelHeading}>
        <div>
          <p>{t.blockSettings}</p>
          <h2>{blockDefinitions.find((definition) => definition.type === block.type)?.label}</h2>
        </div>
      </div>
      {source && (
        <label className={styles.field}>
          <span>{source === 'github' ? t.githubUsername : t.leetcodeUsername}</span>
          <TextInput
            size="l"
            value={String(block.config.username ?? '')}
            placeholder={source === 'github' ? 'octocat' : 'tourist'}
            onUpdate={(value) => onChange({ username: value })}
          />
        </label>
      )}
      {block.type === 'text' && (
        <>
          <label className={styles.field}>
            <span>{locale === 'ru' ? 'Текст' : 'Text'}</span>
            <TextArea
              size="l"
              value={String(block.config.text ?? '')}
              onUpdate={(value) => onChange({ text: value })}
            />
          </label>
          <label className={styles.field}>
            <span>{locale === 'ru' ? 'Выравнивание' : 'Alignment'}</span>
            <Select
              size="l"
              width="max"
              value={[String(block.config.align ?? 'left')]}
              options={[
                { value: 'left', content: 'Left' },
                { value: 'center', content: 'Center' },
                { value: 'right', content: 'Right' },
              ]}
              onUpdate={(value) => onChange({ align: value[0] ?? 'left' })}
            />
          </label>
        </>
      )}
      {block.type === 'github-langs' && (
        <label className={styles.field}>
          <span>{locale === 'ru' ? 'Количество языков' : 'Language count'}</span>
          <TextInput
            size="l"
            type="number"
            value={String(Number(block.config.limit ?? 5))}
            onUpdate={(value) => onChange({ limit: Number(value) })}
          />
        </label>
      )}
      {options.map(([key, label]) => (
        <Checkbox
          key={key}
          size="m"
          className={styles.checkField}
          checked={block.config[key] !== false}
          onUpdate={(checked) => onChange({ [key]: checked })}
        >
          {label}
        </Checkbox>
      ))}
      <p className={styles.muted}>{t.moveResize}</p>
    </section>
  );
};
