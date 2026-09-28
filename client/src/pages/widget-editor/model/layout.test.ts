import type { Widget, WidgetBlock } from '@/entities/widget/model';
import {
  canPlaceBlock,
  dragGridRows,
  findPlacement,
  normalizeWidget,
  withBlockLayout,
} from '@/pages/widget-editor/model/layout';

const block = (id: string, layout: unknown, extra: Partial<WidgetBlock> = {}): WidgetBlock => ({
  id,
  type: 'github-stats',
  position: 0,
  config: { layout },
  ...extra,
});

const widgetWith = (blocks: WidgetBlock[], config: Partial<Widget['config']> = {}): Widget => ({
  id: 'widget-1',
  title: 'Widget',
  slug: 'widget',
  width: 600,
  height: 315,
  public: false,
  createdAt: '',
  updatedAt: '',
  config: {
    palette: 'lavender',
    paletteMode: 'light',
    grid: { columns: 2 },
    renderFormat: 'iframe',
    ...config,
  },
  blocks,
});

describe('canPlaceBlock', () => {
  const widget = widgetWith([
    block('a', { x: 0, y: 0, width: 1, height: 1 }),
    block('b', { x: 1, y: 0, width: 1, height: 2 }),
  ]);

  it('rejects overlaps and out-of-grid layouts', () => {
    expect(canPlaceBlock(widget, 'a', { x: 1, y: 1, width: 1, height: 1 })).toBe(false);
    expect(canPlaceBlock(widget, 'a', { x: 1, y: 2, width: 2, height: 1 })).toBe(false);
  });

  it('ignores the block being moved', () => {
    expect(canPlaceBlock(widget, 'b', { x: 1, y: 1, width: 1, height: 1 })).toBe(true);
    expect(canPlaceBlock(widget, 'a', { x: 0, y: 1, width: 1, height: 2 })).toBe(true);
  });
});

describe('findPlacement', () => {
  it('keeps the preferred cell when it is free', () => {
    const widget = widgetWith([block('a', { x: 0, y: 0, width: 1, height: 1 })]);
    expect(findPlacement(widget, 'a', 2, 1, 0, 0)).toEqual({ x: 0, y: 0, width: 2, height: 1 });
  });

  it('moves a grown block below the blocks it would cover', () => {
    const widget = widgetWith([
      block('a', { x: 0, y: 0, width: 1, height: 1 }),
      block('b', { x: 1, y: 0, width: 1, height: 1 }),
    ]);
    expect(findPlacement(widget, 'a', 2, 1, 0, 0)).toEqual({ x: 0, y: 1, width: 2, height: 1 });
  });
});

it('offers one spare drop row below the lowest block', () => {
  expect(dragGridRows(widgetWith([]))).toBe(2);
  expect(dragGridRows(widgetWith([block('a', { x: 0, y: 1, width: 1, height: 2 })]))).toBe(4);
});

it('updates one block layout without touching the others', () => {
  const widget = widgetWith([
    block('a', { x: 0, y: 0, width: 1, height: 1 }),
    block('b', { x: 1, y: 0, width: 1, height: 1 }),
  ]);
  const next = withBlockLayout(widget, 'b', { x: 0, y: 1, width: 2, height: 1 });
  expect(next.blocks[0]).toBe(widget.blocks[0]);
  expect(next.blocks[1].config.layout).toEqual({ x: 0, y: 1, width: 2, height: 1 });
});

describe('normalizeWidget', () => {
  it('leaves an already normalized widget unchanged', () => {
    const { widget, changed } = normalizeWidget(
      widgetWith([
        block(
          'a',
          { x: 0, y: 0, width: 1, height: 1 },
          { config: { username: 'octocat', layout: { x: 0, y: 0, width: 1, height: 1 } } },
        ),
      ]),
    );
    expect(changed).toBe(false);
    expect(widget.height).toBe(315);
  });

  it('migrates legacy widgets and marks them for saving', () => {
    const legacy = widgetWith(
      [
        { ...block('second', undefined), position: 1 },
        { ...block('first', { x: 5, y: 0, width: 3, height: 9 }), position: 0 },
      ],
      {
        sources: { github: { username: 'octocat' } },
        paletteMode: 'auto' as never,
        grid: { columns: 1 },
      },
    );

    const { widget, changed } = normalizeWidget(legacy);

    expect(changed).toBe(true);
    expect(widget.config.paletteMode).toBe('light');
    expect(widget.config.grid.columns).toBe(2);
    expect(widget.blocks.map((item) => item.id)).toEqual(['first', 'second']);
    expect(widget.blocks[0].config).toMatchObject({
      username: 'octocat',
      layout: { x: 1, y: 0, width: 1, height: 2 },
    });
    expect(widget.blocks[1].config.layout).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(widget.height).toBe(600);
  });
});
