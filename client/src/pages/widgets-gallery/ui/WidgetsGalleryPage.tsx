import type { MouseEvent } from 'react';

import type { AppTheme } from '@/app/config';
import { WidgetCard, type WidgetCardData, type WidgetCardLabels } from '@/entities/widget';
import { messages, type Locale } from '@/shared/locale/content';
import { Sidebar, type SidebarLabels } from '@/widgets/sidebar';
import { WidgetsGalleryHeader } from '@/pages/widgets-gallery/ui/WidgetsGalleryHeader';
import styles from '@/pages/widgets-gallery/ui/WidgetsGalleryPage.module.css';

type WidgetsGalleryPageProps = {
  locale: Locale;
  theme: AppTheme;
  username: string;
  widgets: WidgetCardData[];
  isLanguageLoading: boolean;
  onLocaleToggle: () => void;
  onThemeToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onCreateWidget: () => void;
  onLogout: () => void;
  onDeleteWidget: (title: string) => void;
};

export const WidgetsGalleryPage = ({
  locale,
  theme,
  username,
  widgets,
  isLanguageLoading,
  onLocaleToggle,
  onThemeToggle,
  onCreateWidget,
  onLogout,
  onDeleteWidget,
}: WidgetsGalleryPageProps) => {
  const t = messages[locale];
  const sidebarLabels: SidebarLabels = {
    logout: t.logout,
    createWidget: t.createWidget,
    language: t.language,
    theme: t.theme,
    recentWidgets: t.recentWidgets,
  };
  const widgetLabels: WidgetCardLabels = {
    updated: t.updated,
    open: t.open,
    configure: t.configure,
    remove: t.remove,
    removeTitle: t.removeTitle,
    removeDescription: t.removeDescription,
    cancel: t.cancel,
    confirmRemove: t.confirmRemove,
  };

  return (
    <>
      <Sidebar
        username={username}
        locale={locale}
        theme={theme}
        widgetNames={widgets.map((widget) => widget.title)}
        labels={sidebarLabels}
        onLocaleToggle={onLocaleToggle}
        isLanguageLoading={isLanguageLoading}
        onThemeToggle={onThemeToggle}
        onCreateWidget={onCreateWidget}
        onLogout={onLogout}
      />
      <section className={styles.galleryPage} id="widgets-gallery">
        <WidgetsGalleryHeader
          eyebrow={t.gallery}
          title={t.widgets}
          createWidget={t.createWidget}
          starOnGithub={t.starOnGithub}
          isLanguageLoading={isLanguageLoading}
        />
        <div className={`${styles.widgetGrid} ${styles.widgetGalleryGrid}`}>
          {widgets.map((widget) => (
            <WidgetCard
              key={widget.title}
              widget={widget}
              labels={widgetLabels}
              isLanguageLoading={isLanguageLoading}
              onDelete={onDeleteWidget}
            />
          ))}
        </div>
      </section>
    </>
  );
};
