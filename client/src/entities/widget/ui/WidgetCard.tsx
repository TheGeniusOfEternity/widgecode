import { Copy, Gear, TrashBin } from '@gravity-ui/icons';
import { Button, Card, Icon, Modal } from '@gravity-ui/uikit';
import { useState, type CSSProperties } from 'react';

import { paletteTokens, type WidgetCardData } from '@/entities/widget/model';
import styles from '@/entities/widget/ui/WidgetCard.module.css';

export type WidgetCardLabels = {
  updated: string;
  open: string;
  configure: string;
  copy: string;
  published: string;
  draft: string;
  remove: string;
  removeTitle: string;
  removeDescription: string;
  cancel: string;
  confirmRemove: string;
};

type WidgetCardProps = {
  widget: WidgetCardData;
  labels: WidgetCardLabels;
  onDelete: (id: string) => void;
  onConfigure: (id: string) => void;
  onCopy: (widget: WidgetCardData) => void;
  isLanguageLoading: boolean;
};

export const WidgetCard = ({
  widget,
  labels,
  onDelete,
  onConfigure,
  onCopy,
  isLanguageLoading,
}: WidgetCardProps) => {
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const palette = paletteTokens[widget.accent];
  const useDarkPalette =
    widget.paletteMode === 'dark' ||
    (widget.paletteMode === 'auto' && document.documentElement.dataset.theme === 'dark');
  const tokens = useDarkPalette ? palette.dark : palette.light;
  const previewStyle = {
    '--accent-color': tokens.accent,
    '--accent-soft': tokens.soft,
  } as CSSProperties;

  const confirmDelete = () => {
    setDeleteModalOpen(false);
    onDelete(widget.id);
  };

  return (
    <>
      <Card className={styles.card} view="clear">
        <div className={styles.preview} style={previewStyle}>
          <span>{widget.metric}</span>
          <small>{widget.public ? labels.published : labels.draft}</small>
        </div>
        <div className={styles.info}>
          <div className={styles.meta}>
            <h3 className={isLanguageLoading ? styles.textSkeletonHeading : ''}>
              {isLanguageLoading ? '' : widget.title}
            </h3>
            <p className={isLanguageLoading ? styles.textSkeleton : ''}>
              {isLanguageLoading ? '' : widget.source}
            </p>
            <p className={`${styles.date} ${isLanguageLoading ? styles.textSkeleton : ''}`}>
              {isLanguageLoading
                ? ''
                : `${labels.updated}: ${new Date(widget.updatedAt).toLocaleDateString()}`}
            </p>
          </div>
          <div className={styles.actions}>
            <Button
              view="outlined"
              onClick={() => onConfigure(widget.id)}
              aria-label={labels.configure}
            >
              <Icon data={Gear} size={18} />
            </Button>
            {widget.public && (
              <Button
                view="outlined-action"
                onClick={() => onCopy(widget)}
                aria-label={labels.copy}
              >
                <Icon data={Copy} size={18} />
              </Button>
            )}
            <Button
              view="outlined-danger"
              onClick={() => setDeleteModalOpen(true)}
              aria-label={labels.remove}
            >
              <Icon data={TrashBin} size={18} />
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={isDeleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        aria-labelledby={`${widget.id}-delete-title`}
      >
        <div className={styles.modalContent}>
          <h2 id={`${widget.id}-delete-title`}>{labels.removeTitle}</h2>
          <p>{labels.removeDescription.replace('{title}', widget.title)}</p>
          <div className={styles.modalActions}>
            <Button view="flat" onClick={() => setDeleteModalOpen(false)}>
              {labels.cancel}
            </Button>
            <Button view="outlined-danger" onClick={confirmDelete}>
              {labels.confirmRemove}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
