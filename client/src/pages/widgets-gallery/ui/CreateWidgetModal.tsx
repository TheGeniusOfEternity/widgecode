import { Button, Modal, Select, TextInput } from '@gravity-ui/uikit';
import { useState, type FormEvent } from 'react';

import type { CreateWidgetInput } from '@/shared/api';
import { getPreset, presets } from '@/entities/widget/model';
import type { Locale } from '@/shared/locale/content';
import { messages } from '@/shared/locale/content';
import type { SourceType } from '@/entities/widget/model';
import styles from '@/pages/widgets-gallery/ui/CreateWidgetModal.module.css';

type CreateWidgetModalProps = {
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onSubmit: (input: CreateWidgetInput) => Promise<void>;
};

export const CreateWidgetModal = ({ open, locale, onClose, onSubmit }: CreateWidgetModalProps) => {
  const t = messages[locale];
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<SourceType>('github');
  const [presetId, setPresetId] = useState('github-overview');
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availablePresets = presets.filter((preset) => preset.source === source);

  const handleSourceChange = (nextSource: SourceType) => {
    setSource(nextSource);
    setPresetId(presets.find((preset) => preset.source === nextSource)?.id ?? '');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError(locale === 'ru' ? 'Введите название виджета.' : 'Add a widget name.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        source,
        presetId: presetId || 'custom',
      });
      setTitle('');
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.unavailable);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeading}>
          <div>
            <p className={styles.eyebrow}>{t.createWidget}</p>
            <h2>{t.createTitle}</h2>
          </div>
          <p>{t.createDescription}</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            <span>{t.widgetName}</span>
            <TextInput
              size="l"
              value={title}
              onUpdate={setTitle}
              placeholder="My developer profile"
            />
          </label>
          <label>
            <span>{t.source}</span>
            <Select
              size="l"
              width="max"
              value={[source]}
              options={[
                { value: 'github', content: t.sourceGithub },
                { value: 'leetcode', content: t.sourceLeetcode },
              ]}
              onUpdate={(value) => handleSourceChange((value[0] ?? 'github') as SourceType)}
            />
          </label>
          <fieldset className={styles.presets}>
            <legend>{t.preset}</legend>
            <div className={styles.presetGrid}>
              {availablePresets.map((preset) => (
                <button
                  className={`${styles.preset} ${presetId === preset.id ? styles.presetSelected : ''}`}
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(preset.id)}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
              <button
                className={`${styles.preset} ${presetId === '' ? styles.presetSelected : ''}`}
                type="button"
                onClick={() => setPresetId('')}
              >
                <strong>{t.customPreset}</strong>
                <span>
                  {locale === 'ru' ? 'Начать с чистого canvas.' : 'Start with a clean canvas.'}
                </span>
              </button>
            </div>
          </fieldset>
          {getPreset(presetId) && (
            <p className={styles.selectionNote}>
              {getPreset(presetId)?.blockTypes.length} {t.blocks.toLowerCase()}
            </p>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <Button type="button" view="flat" onClick={onClose}>
              {t.close}
            </Button>
            <Button type="submit" view="action" loading={isSubmitting}>
              {t.create}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
