import { Copy, Gear, TrashBin } from '@gravity-ui/icons';
import { Button, Card, Icon, Modal } from '@gravity-ui/uikit';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { paletteTokens, type WidgetCardData } from '@/entities/widget/model';
import { getPublicWidgetUrl } from '@/shared/api';
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
  onOpenPreview: (widget: WidgetCardData) => void;
  onCopy: (widget: WidgetCardData) => void;
  isLanguageLoading: boolean;
};

const WidgetPreviewFrame = ({ widget }: { widget: WidgetCardData }) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const { paddingLeft, paddingRight, paddingTop, paddingBottom } =
        window.getComputedStyle(viewport);
      const width =
        viewport.clientWidth - Number.parseFloat(paddingLeft) - Number.parseFloat(paddingRight);
      const height =
        viewport.clientHeight - Number.parseFloat(paddingTop) - Number.parseFloat(paddingBottom);
      if (!width || !height) return;
      setScale(Math.min(1, width / widget.width, height / widget.height));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [widget.height, widget.width]);

  return (
    <div
      ref={viewportRef}
      className={`${styles.previewFrameViewport} ${isLoaded ? styles.previewFrameViewportLoaded : ''}`}
      aria-busy={!isLoaded}
    >
      <iframe
        className={`${styles.previewFrame} ${isLoaded ? styles.previewFrameLoaded : ''}`}
        src={getPublicWidgetUrl(widget.slug, true)}
        title={widget.title}
        width={widget.width}
        height={widget.height}
        style={{
          width: `${widget.width}px`,
          height: `${widget.height}px`,
          transform: `scale(${scale})`,
        }}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export const WidgetCard = ({
  widget,
  labels,
  onDelete,
  onConfigure,
  onOpenPreview,
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
          {widget.public ? (
            <WidgetPreviewFrame widget={widget} />
          ) : (
            <>
              <span>{widget.metric}</span>
              <small>{labels.draft}</small>
            </>
          )}
          <button
            className={styles.previewOverlay}
            type="button"
            onClick={() => onOpenPreview(widget)}
            aria-label={`${widget.public ? labels.open : labels.configure}: ${widget.title}`}
          >
            <span>{widget.public ? labels.open : labels.configure}</span>
          </button>
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
              className={styles.configureAction}
              onClick={() => onConfigure(widget.id)}
              aria-label={labels.configure}
            >
              <Icon data={Gear} size={18} />
            </Button>
            <Button
              disabled={!widget.public}
              view="outlined"
              onClick={() => onCopy(widget)}
              aria-label={labels.copy}
            >
              <Icon data={Copy} size={18} />
            </Button>
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
