import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

import { WidgetCanvas, type PublicWidgetResponse } from '@/entities/widget';
import { getPublicWidget } from '@/shared/api';
import type { Locale } from '@/shared/locale/content';
import { messages } from '@/shared/locale/content';
import { AuthTransitionLoader } from '@/shared/ui/auth-transition-loader/AuthTransitionLoader';
import styles from '@/pages/public-widget/ui/PublicWidgetPage.module.css';

type PublicWidgetPageProps = {
  slug: string;
  locale: Locale;
};

export const PublicWidgetPage = ({ slug, locale }: PublicWidgetPageProps) => {
  const t = messages[locale];
  const prefersReducedMotion = useReducedMotion();
  const [payload, setPayload] = useState<PublicWidgetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPublicWidget(slug)
      .then((nextPayload) => {
        if (!cancelled) setPayload(nextPayload);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : t.unavailable);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, t.unavailable]);

  if (error)
    return (
      <main className={styles.status} role="alert">
        {error}
      </main>
    );
  if (!payload)
    return (
      <main className={styles.status}>
        <AuthTransitionLoader locale={locale} reducedMotion={Boolean(prefersReducedMotion)} />
      </main>
    );

  const widget = {
    ...payload.widget,
    config: {
      ...payload.widget.config,
      palette: payload.widget.config?.palette ?? 'lavender',
      paletteMode: payload.widget.config?.paletteMode ?? 'auto',
      grid: payload.widget.config?.grid ?? { columns: 1 },
    },
  };
  const { rendered } = payload;
  const sourceNames = [
    ...new Set(
      widget.blocks
        .map((block) => {
          if (block.type.startsWith('github')) return 'GitHub';
          if (block.type.startsWith('leetcode')) return 'LeetCode';
          return null;
        })
        .filter(Boolean),
    ),
  ];

  return (
    <main className={styles.publicPage} style={{ minHeight: `${Math.max(widget.height, 240)}px` }}>
      <header className={styles.publicHeader}>
        <div>
          <span>{sourceNames.join(' + ') || 'Developer stats'}</span>
          <h1>{widget.title}</h1>
        </div>
        <small>{new Date(widget.updatedAt).toLocaleDateString()}</small>
      </header>
      <WidgetCanvas
        blocks={widget.blocks}
        palette={widget.config.palette}
        paletteMode={widget.config.paletteMode}
        columns={widget.config.grid.columns}
        width={widget.width}
        height={widget.height}
        renderedBlocks={rendered.blocks}
        locale={locale}
      />
      <footer className={styles.publicFooter}>
        /{widget.slug} · cached {Math.round(rendered.cacheTtlSeconds / 60)} min
      </footer>
    </main>
  );
};
