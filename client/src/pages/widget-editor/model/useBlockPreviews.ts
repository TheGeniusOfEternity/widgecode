import { useEffect, useState, type RefObject } from 'react';

import type { RenderedBlock, Widget } from '@/entities/widget/model';
import { previewWidgetBlock } from '@/shared/api';
import { sourceForBlock } from '@/pages/widget-editor/model/layout';

const PREVIEW_DEBOUNCE_MS = 350;

const previewSignature = (widget: Widget | null) =>
  widget?.blocks
    .map((block) =>
      JSON.stringify({
        id: block.id,
        type: block.type,
        username: block.config.username,
        limit: block.config.limit,
      }),
    )
    .join('|') ?? '';

/**
 * Live data for blocks that have a data source and a username. Refetches only when a block's
 * identity, username or limit changes, not on every edit (layout, text, palette).
 */
export const useBlockPreviews = (
  widget: Widget | null,
  widgetRef: RefObject<Widget | null>,
  unavailableMessage: string,
) => {
  const [previews, setPreviews] = useState<Record<string, RenderedBlock>>({});
  const signature = previewSignature(widget);

  useEffect(() => {
    const currentWidget = widgetRef.current;
    if (!currentWidget) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      const previewable = currentWidget.blocks.filter((block) => {
        const username =
          typeof block.config.username === 'string' ? block.config.username.trim() : '';
        return sourceForBlock(block.type) !== null && Boolean(username);
      });

      if (previewable.length === 0) {
        setPreviews({});
        return;
      }

      void Promise.all(
        previewable.map(async (block) => {
          try {
            return [block.id, await previewWidgetBlock(currentWidget.id, block)] as const;
          } catch (previewError) {
            return [
              block.id,
              {
                id: block.id,
                type: block.type,
                position: block.position,
                error: previewError instanceof Error ? previewError.message : unavailableMessage,
              },
            ] as const;
          }
        }),
      ).then((results) => {
        if (!cancelled) setPreviews(Object.fromEntries(results));
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [signature, unavailableMessage, widget?.id, widgetRef]);

  return previews;
};
