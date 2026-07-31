import { Gear, ArrowRight, TrashBin, Copy } from '@gravity-ui/icons';
import { Button, Card, Icon, Modal } from '@gravity-ui/uikit';
import { useState } from 'react';

import styles from './WidgetCard.module.css';

export type WidgetCardData = {
  title: string;
  source: string;
  metric: string;
  accent: 'lavender' | 'mint' | 'blue' | 'violet';
};

export type WidgetCardLabels = {
  updated: string;
  open: string;
  configure: string;
  remove: string;
  removeTitle: string;
  removeDescription: string;
  cancel: string;
  confirmRemove: string;
};

type WidgetCardProps = {
  widget: WidgetCardData;
  labels: WidgetCardLabels;
  onDelete: (title: string) => void;
  isLanguageLoading: boolean;
};

const accentClass = {
  lavender: styles.accentLavender,
  mint: styles.accentMint,
  blue: styles.accentBlue,
  violet: styles.accentViolet,
} as const;

export const WidgetCard = ({ widget, labels, onDelete, isLanguageLoading }: WidgetCardProps) => {
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const confirmDelete = () => {
    setDeleteModalOpen(false);
    onDelete(widget.title);
  };

  return (
    <>
      <Card className={`${styles.card} ${accentClass[widget.accent]}`} view="clear">
        <div className={styles.preview}>
          <span>{widget.metric}</span>
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
              {isLanguageLoading ? '' : `${labels.updated}: 30 Jul`}
            </p>
          </div>
          <div className={styles.actions}>
            <Button view="outlined" onClick={() => undefined} aria-label={labels.configure}>
              <Icon data={Gear} size={18} />
            </Button>
            <Button view="outlined-action" onClick={() => undefined} aria-label={labels.configure}>
              <Icon data={Copy} size={18} />
            </Button>
            <Button
              view="outlined-danger"
              onClick={() => setDeleteModalOpen(true)}
              aria-label={labels.remove}
            >
              <Icon data={TrashBin} size={18} />
            </Button>
            <Button view="action" onClick={() => undefined} aria-label={labels.open}>
              <Icon data={ArrowRight} size={18} />
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={isDeleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        aria-labelledby={`${widget.title}-delete-title`}
      >
        <div className={styles.modalContent}>
          <h2 id={`${widget.title}-delete-title`}>{labels.removeTitle}</h2>
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
