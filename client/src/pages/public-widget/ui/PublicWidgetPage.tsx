import { useEffect, useState, type CSSProperties } from 'react';

import { WidgetCanvas, WidgetCanvasSkeleton, type PublicWidgetResponse } from '@/entities/widget';
import { getPublicWidget, PUBLIC_WIDGET_MESSAGE_SOURCE } from '@/shared/api';
import type { Locale } from '@/shared/locale/content';
import { messages } from '@/shared/locale/content';
import styles from '@/pages/public-widget/ui/PublicWidgetPage.module.css';

type PublicWidgetPageProps = {
  slug: string;
  locale: Locale;
  embed?: boolean;
};

const DEFAULT_WIDGET_DIMENSIONS = { width: 600, height: 400 };

const readDimension = (name: 'width' | 'height', fallback: number) => {
  const value = Number(new URLSearchParams(window.location.search).get(name));
  return Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 2000) : fallback;
};

export const PublicWidgetPage = ({ slug, locale, embed = false }: PublicWidgetPageProps) => {
  const t = messages[locale];
  const initialDimensions = {
    width: readDimension('width', DEFAULT_WIDGET_DIMENSIONS.width),
    height: readDimension('height', DEFAULT_WIDGET_DIMENSIONS.height),
  };
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

  useEffect(() => {
    if (!embed || window.parent === window || (!payload && !error)) return;
    window.parent.postMessage(
      {
        source: PUBLIC_WIDGET_MESSAGE_SOURCE,
        type: error ? 'error' : 'ready',
        slug,
      },
      window.location.origin,
    );
  }, [embed, error, payload, slug]);

  if (error)
    return (
      <div className={`${styles.status} ${embed ? styles.embedStatus : ''}`} role="alert">
        {error}
      </div>
    );
  if (!payload)
    return (
      <div className={`${styles.status} ${embed ? styles.embedStatus : ''}`}>
        <WidgetCanvasSkeleton
          embed={embed}
          locale={locale}
          width={initialDimensions.width}
          height={initialDimensions.height}
        />
      </div>
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
  const canvas = (
    <WidgetCanvas
      blocks={widget.blocks}
      palette={widget.config.palette}
      paletteMode={widget.config.paletteMode}
      columns={widget.config.grid.columns}
      width={widget.width}
      height={widget.height}
      renderedBlocks={rendered.blocks}
      locale={locale}
      showChrome={!embed}
    />
  );

  if (!embed)
    return (
      <div
        className={styles.publicPage}
        style={
          {
            minHeight: `${Math.max(widget.height, 240)}px`,
            '--public-widget-width': `${widget.width}px`,
          } as CSSProperties
        }
      >
        <header className={styles.publicHeader}>
          <div>
            <span>{sourceNames.join(' + ') || 'Developer stats'}</span>
            <h1>{widget.title}</h1>
          </div>
          <small>{new Date(widget.updatedAt).toLocaleDateString()}</small>
        </header>
        {canvas}
        <footer className={styles.publicFooter}>
          /{widget.slug} · cached {Math.round(rendered.cacheTtlSeconds / 60)} min
        </footer>
      </div>
    );

  return (
    <div
      className={styles.embedPage}
      style={{ width: `${widget.width}px`, height: `${widget.height}px` }}
    >
      {canvas}
    </div>
  );
};
