import { blockMetrics, blockStyleVars, canvasStyleVars } from '@/entities/widget/lib/canvasStyle';

it('exposes shared canvas geometry as CSS custom properties', () => {
  const vars = canvasStyleVars('mint', { width: 600, height: 315 }) as Record<string, unknown>;
  expect(vars).toMatchObject({
    '--widget-width': '600px',
    '--widget-height': '315px',
    '--widget-padding': '24px',
    '--widget-gap': '18px',
    '--block-padding': '20px',
    '--widget-light-accent': '#2caa8a',
  });
});

it('sizes block typography from the column span, like the SVG export', () => {
  expect(blockMetrics({ x: 0, y: 0, width: 1, height: 1 }).contentWidth).toBe(225);
  const half = blockStyleVars({ x: 1, y: 2, width: 1, height: 2 }) as Record<string, unknown>;
  const full = blockStyleVars({ x: 0, y: 0, width: 2, height: 1 }) as Record<string, unknown>;

  expect(half).toMatchObject({
    gridColumn: '2 / span 1',
    gridRow: '3 / span 2',
    '--block-stat': '22.5px',
  });
  expect(full).toMatchObject({ '--block-stat': '30px', '--block-meta': '12px' });
});
