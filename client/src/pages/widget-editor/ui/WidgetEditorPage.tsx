import { Button } from '@gravity-ui/uikit';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import type { Widget } from '@/entities/widget/model';
import { useBlockPreviews } from '@/pages/widget-editor/model/useBlockPreviews';
import { useGridDrag } from '@/pages/widget-editor/model/useGridDrag';
import { useWidgetEditor } from '@/pages/widget-editor/model/useWidgetEditor';
import { BlockConfigPanel } from '@/pages/widget-editor/ui/BlockConfigPanel';
import { BlockLibrary } from '@/pages/widget-editor/ui/BlockLibrary';
import { EditorCanvas } from '@/pages/widget-editor/ui/EditorCanvas';
import { EditorHeader } from '@/pages/widget-editor/ui/EditorHeader';
import { MobileFallback } from '@/pages/widget-editor/ui/MobileFallback';
import { WidgetConfigPanel } from '@/pages/widget-editor/ui/WidgetConfigPanel';
import { messages, type Locale } from '@/shared/locale/content';
import { AuthTransitionLoader } from '@/shared/ui/auth-transition-loader/AuthTransitionLoader';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

const MOBILE_QUERY = '(max-width: 760px)';

type WidgetEditorPageProps = {
  widgetId: string;
  locale: Locale;
  onBack: () => void;
  onOpenPublic: (slug: string) => void;
  onSave?: (widget: Widget) => void;
};

const useIsMobile = () => {
  const [isMobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return isMobile;
};

export const WidgetEditorPage = ({
  widgetId,
  locale,
  onBack,
  onOpenPublic,
  onSave,
}: WidgetEditorPageProps) => {
  const t = messages[locale];
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const editor = useWidgetEditor({ widgetId, enabled: !isMobile, messages: t, onSave });
  const previews = useBlockPreviews(editor.widget, editor.widgetRef, t.unavailable);
  const drag = useGridDrag({
    widgetRef: editor.widgetRef,
    updateLocalWidget: editor.updateLocalWidget,
    onDragStart: editor.selectBlock,
  });
  const { widget, selectedBlock } = editor;

  const leave = async () => {
    if (editor.isDirtyRef.current) await editor.save();
    onBack();
  };

  if (isMobile) return <MobileFallback locale={locale} />;
  if (editor.isLoading)
    return (
      <div className={styles.status}>
        <AuthTransitionLoader
          locale={locale}
          reducedMotion={Boolean(prefersReducedMotion)}
          title={t.loadingWidget}
          subtitle={t.loadingWidgetSubtitle}
        />
      </div>
    );
  if (!widget)
    return (
      <div className={styles.status} role="alert">
        {editor.error || t.unavailable}
      </div>
    );

  return (
    <section className={styles.editorPage}>
      <EditorHeader
        widget={widget}
        locale={locale}
        isDirty={editor.isDirty}
        isSaving={editor.isSaving}
        onBack={() => void leave()}
        onOpenPublic={() => onOpenPublic(widget.slug)}
        onPublish={() => void editor.save(true)}
      />

      <div className={styles.editorGrid}>
        <BlockLibrary
          locale={locale}
          blockCount={widget.blocks.length}
          onAdd={(type) => void editor.addBlock(type)}
        />

        <main className={styles.canvasArea}>
          <div className={styles.canvasMeta}>
            <span>canvas / {widget.slug}</span>
            <span>
              {widget.blocks.length} {t.blocks.toLowerCase()} · {widget.width} × {widget.height}
            </span>
          </div>
          <EditorCanvas
            widget={widget}
            locale={locale}
            previews={previews}
            selectedBlockId={selectedBlock?.id ?? null}
            gridRef={drag.gridRef}
            draggingBlockId={drag.draggingBlockId}
            dropCell={drag.dropCell}
            pointerHandlers={drag.pointerHandlers}
            onSelectBlock={editor.selectBlock}
            onRemoveBlock={(blockId) => void editor.removeBlock(blockId)}
            onResizeBlock={drag.resizeBlock}
          />
          {editor.error && (
            <p className={styles.inlineError} role="alert">
              {editor.error}
            </p>
          )}
        </main>

        <aside className={styles.rightPanel}>
          <div className={styles.panelTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={editor.activePanel === 'widget'}
              className={editor.activePanel === 'widget' ? styles.panelTabActive : styles.panelTab}
              onClick={() => editor.setActivePanel('widget')}
            >
              {t.widgetTab}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={editor.activePanel === 'block'}
              className={editor.activePanel === 'block' ? styles.panelTabActive : styles.panelTab}
              onClick={() => editor.setActivePanel('block')}
              disabled={!selectedBlock}
            >
              {t.blockTab}
            </button>
          </div>
          {editor.activePanel === 'widget' ? (
            <WidgetConfigPanel
              widget={widget}
              locale={locale}
              onChange={editor.updateLocalWidget}
            />
          ) : selectedBlock ? (
            <BlockConfigPanel
              block={selectedBlock}
              locale={locale}
              onChange={(patch) => editor.updateBlockConfig(selectedBlock.id, patch)}
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
              <Button
                view="outlined"
                onClick={() => void editor.unpublish()}
                loading={editor.isSaving}
              >
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
