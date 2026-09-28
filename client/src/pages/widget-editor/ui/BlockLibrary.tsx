import { Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { blockDefinitions, type BlockType } from '@/entities/widget/model';
import { MAX_BLOCKS } from '@/pages/widget-editor/model/layout';
import { messages, type Locale } from '@/shared/locale/content';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

const glyphFor = (type: BlockType) =>
  type === 'text' ? 'T' : type.startsWith('github') ? 'GH' : 'LC';

export const BlockLibrary = ({
  locale,
  blockCount,
  onAdd,
}: {
  locale: Locale;
  blockCount: number;
  onAdd: (type: BlockType) => void;
}) => {
  const t = messages[locale];
  return (
    <aside className={styles.leftPanel}>
      <div className={styles.panelHeading}>
        <div>
          <p>{t.blockLibrary}</p>
          <h2>{t.addBlock}</h2>
        </div>
        <span className={styles.blockCount}>
          {blockCount}/{MAX_BLOCKS}
        </span>
      </div>
      <div className={styles.library}>
        {blockDefinitions.map((definition) => (
          <button
            type="button"
            className={styles.libraryItem}
            key={definition.type}
            onClick={() => onAdd(definition.type)}
            disabled={blockCount >= MAX_BLOCKS}
          >
            <span className={styles.libraryGlyph}>{glyphFor(definition.type)}</span>
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
  );
};
