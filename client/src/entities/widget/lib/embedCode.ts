import { getPublicWidgetImageUrl, getPublicWidgetUrl } from '@/shared/api';
import { escapeHtmlAttribute } from '@/shared/lib/escapeHtml';

export type EmbedFormat = 'iframe' | 'svg';

type EmbeddableWidget = { slug: string; title: string; width: number; height: number };

/** HTML snippet for embedding a public widget, as copied from the gallery and the editor. */
export const widgetEmbedCode = (
  widget: EmbeddableWidget,
  format: EmbedFormat,
  locale: 'ru' | 'en',
) => {
  const size = `width="${widget.width}" height="${widget.height}"`;
  if (format === 'svg') {
    const src = getPublicWidgetImageUrl(widget.slug, locale);
    return `<img src="${src}" alt="${escapeHtmlAttribute(widget.title)}" ${size} />`;
  }
  const src = getPublicWidgetUrl(widget.slug, true, { width: widget.width, height: widget.height });
  return `<iframe src="${escapeHtmlAttribute(src)}" ${size} style="display:block;border:0" loading="lazy"></iframe>`;
};
