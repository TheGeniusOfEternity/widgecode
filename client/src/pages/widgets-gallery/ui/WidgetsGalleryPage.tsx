import type { MouseEvent } from 'react';
import { useState } from 'react';

import type { AppTheme } from '@/app/config';
import { WidgetCard, type WidgetCardData, type WidgetCardLabels } from '@/entities/widget';
import type { CreateWidgetInput } from '@/shared/api';
import { messages, type Locale } from '@/shared/locale/content';
import { CreateWidgetModal } from '@/pages/widgets-gallery/ui/CreateWidgetModal';
import { WidgetsGalleryHeader } from '@/pages/widgets-gallery/ui/WidgetsGalleryHeader';
import styles from '@/pages/widgets-gallery/ui/WidgetsGalleryPage.module.css';
import { Sidebar, type SidebarLabels } from '@/widgets/sidebar';

type WidgetsGalleryPageProps = {
  locale: Locale;
  theme: AppTheme;
  username: string;
  widgets: WidgetCardData[];
  isLanguageLoading: boolean;
  onLocaleToggle: () => void;
  onThemeToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onCreateWidget: (input: CreateWidgetInput) => Promise<void>;
  onOpenWidget: (id: string) => void;
  onOpenPreview: (widget: WidgetCardData) => void;
  onCopyWidget: (widget: WidgetCardData) => void;
  onLogout: () => void;
  onDeleteWidget: (id: string) => void;
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
  onOpenWidget,
  onOpenPreview,
  onCopyWidget,
  onLogout,
  onDeleteWidget,
}: WidgetsGalleryPageProps) => {
  const t = messages[locale];
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const sidebarLabels: SidebarLabels = {
    logout: t.logout,
    createWidget: t.createWidget,
    openWidget: t.open,
    language: t.language,
    theme: t.theme,
    recentWidgets: t.recentWidgets,
  };
  const widgetLabels: WidgetCardLabels = {
    updated: t.updated,
    open: t.open,
    configure: t.configure,
    copy: t.copy,
    published: t.published,
    draft: t.draft,
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
        widgetNames={widgets.map((widget) => ({ id: widget.id, title: widget.title }))}
        labels={sidebarLabels}
        onLocaleToggle={onLocaleToggle}
        onThemeToggle={onThemeToggle}
        onCreateWidget={() => setCreateModalOpen(true)}
        onOpenWidget={onOpenWidget}
        onLogout={onLogout}
        isLanguageLoading={isLanguageLoading}
      />
      <section className={styles.galleryPage} id="widgets-gallery">
        <WidgetsGalleryHeader
          eyebrow={t.gallery}
          title={t.widgets}
          createWidget={t.createWidget}
          starOnGithub={t.starOnGithub}
          isLanguageLoading={isLanguageLoading}
          onCreateWidget={() => setCreateModalOpen(true)}
        />
        {widgets.length > 0 ? (
          <div className={`${styles.widgetGrid} ${styles.widgetGalleryGrid}`}>
            {widgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                labels={widgetLabels}
                isLanguageLoading={isLanguageLoading}
                onDelete={onDeleteWidget}
                onConfigure={onOpenWidget}
                onOpenPreview={onOpenPreview}
                onCopy={onCopyWidget}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h2>{t.noWidgets}</h2>
            <p>{t.noWidgetsDescription}</p>
            <button type="button" onClick={() => setCreateModalOpen(true)}>
              {t.createWidget}
            </button>
          </div>
        )}
      </section>
      <CreateWidgetModal
        open={isCreateModalOpen}
        locale={locale}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={onCreateWidget}
      />
    </>
  );
};
