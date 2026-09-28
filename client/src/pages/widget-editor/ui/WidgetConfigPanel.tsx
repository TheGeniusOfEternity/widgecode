import { TextInput } from '@gravity-ui/uikit';

import { palettes, type PaletteMode, type Widget } from '@/entities/widget/model';
import { messages, type Locale } from '@/shared/locale/content';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

export const WidgetConfigPanel = ({
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
      <div className={styles.modeField}>
        <span>{t.palette}</span>
        <div className={styles.modeOptions}>
          {(['light', 'dark'] as PaletteMode[]).map((mode) => (
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
              {mode === 'light' ? t.light : t.dark}
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
