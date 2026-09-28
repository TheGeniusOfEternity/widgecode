import type { Widget, WidgetBlock } from '@/entities/widget/model';
import {
  dragGridRows,
  getLayout,
  moveBlock,
  normalizeWidget,
  placeBlock,
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

const layouts = (widget: Widget) =>
  Object.fromEntries(widget.blocks.map((item) => [item.id, getLayout(item)]));

describe('placeBlock', () => {
  // A B
  // C D
  const grid = widgetWith([
    block('a', { x: 0, y: 0, width: 1, height: 1 }),
    block('b', { x: 1, y: 0, width: 1, height: 1 }),
    block('c', { x: 0, y: 1, width: 1, height: 1 }),
    block('d', { x: 1, y: 1, width: 1, height: 1 }),
  ]);

  it('keeps a resized block in place and pushes the blocks below it down', () => {
    expect(layouts(placeBlock(grid, 'b', { x: 1, y: 0, width: 1, height: 2 }))).toEqual({
      a: { x: 0, y: 0, width: 1, height: 1 },
      b: { x: 1, y: 0, width: 1, height: 2 },
      c: { x: 0, y: 1, width: 1, height: 1 },
      d: { x: 1, y: 2, width: 1, height: 1 },
    });
  });

  it('cascades pushes when a block grows to the full width', () => {
    expect(layouts(placeBlock(grid, 'a', { x: 0, y: 0, width: 2, height: 1 }))).toEqual({
      a: { x: 0, y: 0, width: 2, height: 1 },
      b: { x: 1, y: 1, width: 1, height: 1 },
      c: { x: 0, y: 1, width: 1, height: 1 },
      d: { x: 1, y: 2, width: 1, height: 1 },
    });
  });

  it('shifts a block in the right column left when it grows wider than the grid allows', () => {
    const next = layouts(placeBlock(grid, 'b', { x: 1, y: 0, width: 2, height: 1 }));
    expect(next.b).toEqual({ x: 0, y: 0, width: 2, height: 1 });
    expect(next.a).toEqual({ x: 0, y: 1, width: 1, height: 1 });
  });

  it('closes the gap when a block shrinks back', () => {
    const grown = placeBlock(grid, 'b', { x: 1, y: 0, width: 1, height: 2 });
    expect(layouts(placeBlock(grown, 'b', { x: 1, y: 0, width: 1, height: 1 }))).toEqual(
      layouts(grid),
    );
  });

  it('swaps places when a block is dropped onto an occupied cell below it', () => {
    expect(layouts(placeBlock(grid, 'a', { x: 0, y: 1, width: 1, height: 1 }))).toMatchObject({
      a: { x: 0, y: 1 },
      c: { x: 0, y: 0 },
    });
  });

  it('swaps places when a block is dropped onto an occupied cell above it', () => {
    expect(layouts(placeBlock(grid, 'd', { x: 1, y: 0, width: 1, height: 1 }))).toMatchObject({
      d: { x: 1, y: 0 },
      b: { x: 1, y: 1 },
    });
  });

  it('lifts a block dropped into an empty row below the others', () => {
    expect(layouts(placeBlock(grid, 'a', { x: 0, y: 2, width: 1, height: 1 }))).toMatchObject({
      c: { x: 0, y: 0 },
      a: { x: 0, y: 1 },
    });
  });

  it('leaves untouched blocks as the same objects', () => {
    const next = placeBlock(grid, 'b', { x: 1, y: 0, width: 1, height: 2 });
    expect(next.blocks[0]).toBe(grid.blocks[0]);
    expect(next.blocks[2]).toBe(grid.blocks[2]);
  });
});

describe('moveBlock', () => {
  const grid = widgetWith([
    block('a', { x: 0, y: 0, width: 1, height: 1 }),
    block('b', { x: 1, y: 0, width: 1, height: 1 }),
    block('c', { x: 0, y: 1, width: 1, height: 2 }),
  ]);

  it('swaps two blocks of the same size', () => {
    expect(layouts(moveBlock(grid, 'a', { x: 1, y: 0 }))).toMatchObject({
      a: { x: 1, y: 0 },
      b: { x: 0, y: 0 },
      c: { x: 0, y: 1 },
    });
  });

  it('pushes blocks of a different size instead of swapping', () => {
    expect(layouts(moveBlock(grid, 'b', { x: 0, y: 1 }))).toMatchObject({
      b: { x: 0, y: 1 },
      c: { x: 0, y: 2 },
    });
  });
});

it('offers one spare drop row below the lowest block', () => {
  expect(dragGridRows(widgetWith([]))).toBe(2);
  expect(dragGridRows(widgetWith([block('a', { x: 0, y: 1, width: 1, height: 2 })]))).toBe(4);
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
    expect(widget.blocks[1].config.layout).toEqual({ x: 0, y: 1, width: 1, height: 1 });
    expect(widget.height).toBe(600);
  });
});
