import type { Locale } from '@/shared/locale/content';
import styles from '@/pages/widget-editor/ui/WidgetEditorPage.module.css';

export const MobileFallback = ({ locale }: { locale: Locale }) => (
  <main className={styles.mobileFallback} role="note">
    <div className={styles.mobileFallbackCard}>
      <span className={styles.mobileFallbackMark}>W</span>
      <p>{locale === 'ru' ? 'Конструктор доступен на desktop' : 'Desktop editor only'}</p>
      <h1>
        {locale === 'ru'
          ? 'Откройте этот экран на компьютере'
          : 'Open this editor on a desktop device'}
      </h1>
      <span>
        {locale === 'ru'
          ? 'На большом экране удобнее настраивать сетку, размеры и данные блоков.'
          : 'The grid, block sizes, and live data controls are optimized for a larger screen.'}
      </span>
    </div>
  </main>
);
