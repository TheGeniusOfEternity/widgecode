import type {
  BlockLayout,
  PaletteId,
  PaletteMode,
  RenderedBlock,
  WidgetBlock,
} from '@/entities/widget/model';
import { WidgetSurface } from '@/entities/widget/ui/WidgetSurface';
import { MAX_GRID_COLUMNS, WIDGET_WIDTH, widgetDimensions } from '@shared/widget/geometry';
import { layoutOf } from '@shared/widget/svgPrimitives';

type WidgetLocale = 'ru' | 'en';

type WidgetCanvasProps = {
  blocks: WidgetBlock[];
  palette: PaletteId;
  paletteMode?: PaletteMode;
  columns?: number;
  width?: number;
  height?: number;
  renderedBlocks?: RenderedBlock[];
  locale?: WidgetLocale;
  title?: string;
};

/**
 * The widget as shown on the public page and in iframes, at its stored size. Wrap it in
 * `ScaledWidgetFrame` to fit smaller containers. Rendering is shared with the SVG export.
 */
export const WidgetCanvas = ({
  blocks,
  palette,
  paletteMode = 'light',
  columns = MAX_GRID_COLUMNS,
  width = WIDGET_WIDTH,
  height,
  renderedBlocks,
  locale = 'en',
  title,
}: WidgetCanvasProps) => (
  <WidgetSurface
    blocks={blocks}
    renderedBlocks={renderedBlocks}
    palette={palette}
    paletteMode={paletteMode}
    width={width}
    height={height ?? widgetDimensions(blocks.map(layoutOf), width).height}
    columns={columns}
    locale={locale}
    label={title}
  />
);

const skeletonLayouts: BlockLayout[] = [
  { x: 0, y: 0, width: 1, height: 1 },
  { x: 1, y: 0, width: 1, height: 1 },
];

// Data blocks with a username and no data yet render as loading placeholders.
const skeletonBlocks: WidgetBlock[] = skeletonLayouts.map((layout, index) => ({
  id: `skeleton-${index}`,
  type: 'github-stats',
  position: index,
  config: { username: 'loading', layout },
}));

export const WidgetCanvasSkeleton = ({
  locale = 'en',
  width = WIDGET_WIDTH,
  height = widgetDimensions(skeletonLayouts).height,
}: {
  locale?: WidgetLocale;
  width?: number;
  height?: number;
}) => (
  <div role="status" aria-label={locale === 'ru' ? 'Загрузка виджета' : 'Loading widget'}>
    <WidgetSurface
      blocks={skeletonBlocks}
      palette="lavender"
      width={width}
      height={height}
      locale={locale}
    />
  </div>
);
