import { ArrowLeft, Check, Copy, Eye } from '@gravity-ui/icons';
import { Button, Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { widgetEmbedCode, type EmbedFormat } from '@/entities/widget/lib/embedCode';
import type { Widget } from '@/entities/widget/model';
import { messages, type Locale } from '@/shared/locale/content';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

const COPIED_FEEDBACK_MS = 1600;

type EditorHeaderProps = {
  widget: Widget;
  locale: Locale;
  isDirty: boolean;
  isSaving: boolean;
  onBack: () => void;
  onOpenPublic: () => void;
  onPublish: () => void;
};

export const EditorHeader = ({
  widget,
  locale,
  isDirty,
  isSaving,
  onBack,
  onOpenPublic,
  onPublish,
}: EditorHeaderProps) => {
  const t = messages[locale];
  const [copied, setCopied] = useState<EmbedFormat | null>(null);

  const copy = async (format: EmbedFormat) => {
    await navigator.clipboard?.writeText(widgetEmbedCode(widget, format, locale));
    setCopied(format);
    window.setTimeout(() => setCopied(null), COPIED_FEEDBACK_MS);
  };

  return (
    <header className={styles.editorHeader}>
      <div className={styles.headerLeft}>
        <Button view="flat" onClick={onBack} aria-label={t.back}>
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
        {widget.public ? (
          <>
            <Button view="outlined" onClick={onOpenPublic}>
              <Icon data={Eye} size={17} />
              {t.open}
            </Button>
            <Button view="outlined-action" onClick={() => void copy('iframe')}>
              <Icon data={copied === 'iframe' ? Check : Copy} size={17} />
              {copied === 'iframe' ? t.copied : t.copyIframe}
            </Button>
            <Button view="outlined-action" onClick={() => void copy('svg')}>
              <Icon data={copied === 'svg' ? Check : Copy} size={17} />
              {copied === 'svg' ? t.copied : t.copySvg}
            </Button>
          </>
        ) : (
          <Button view="outlined-action" onClick={onPublish} loading={isSaving}>
            {t.publish}
          </Button>
        )}
      </div>
    </header>
  );
};
