import {
  blockBox,
  blockContentWidth,
  blockTypography,
  canvasPadding,
  cellSize,
  widgetDimensions,
} from '@shared/widget/geometry.js';

it('uses square 129px cells: a 4×4 grid is exactly 600×600', () => {
  expect(canvasPadding(600)).toBe(24);
  expect(cellSize(600)).toBe(129);
  expect(widgetDimensions([{ x: 0, y: 0, width: 2, height: 2 }])).toEqual({
    width: 600,
    height: 318,
  });
  expect(widgetDimensions([{ x: 0, y: 3, width: 4, height: 1 }])).toEqual({
    width: 600,
    height: 600,
  });
  // The editable maximum: 5 rows.
  expect(widgetDimensions([{ x: 0, y: 4, width: 1, height: 1 }]).height).toBe(741);
});

it('places blocks on the same grid the stored size was computed from', () => {
  const layouts = [
    { x: 0, y: 0, width: 1, height: 1 },
    { x: 1, y: 0, width: 3, height: 2 },
    { x: 0, y: 1, width: 1, height: 1 },
  ];
  const canvas = { ...widgetDimensions(layouts), rows: 2 };

  expect(blockBox(layouts[0], canvas)).toEqual({ x: 24, y: 24, width: 129, height: 129 });
  expect(blockBox(layouts[1], canvas)).toEqual({ x: 165, y: 24, width: 411, height: 270 });
  expect(blockBox(layouts[2], canvas)).toEqual({ x: 24, y: 165, width: 129, height: 129 });
});

it('scales block typography with content width within fixed bounds', () => {
  const half = blockTypography(blockContentWidth(270));
  const full = blockTypography(blockContentWidth(552));

  expect([129, 270, 411, 552].map(blockContentWidth)).toEqual([103, 244, 385, 526]);
  expect(half.statValue).toBeCloseTo(24.4);
  expect(full.statValue).toBe(30);
  expect(half.meta).toBeCloseTo(10.98);
  expect(full.meta).toBe(12);
});

it('finds the top-most free spot within the row limit', async () => {
  const { findFreeSpot } = await import('@shared/widget/geometry.js');
  const taken = [
    { x: 0, y: 0, width: 2, height: 2 },
    { x: 2, y: 0, width: 2, height: 1 },
  ];
  expect(findFreeSpot(taken, { width: 2, height: 2 })).toEqual({ x: 2, y: 1, width: 2, height: 2 });
  expect(findFreeSpot([{ x: 0, y: 0, width: 4, height: 5 }], { width: 1, height: 1 })).toBeNull();
});

it('switches stats to compact notation only when they do not fit the column', async () => {
  const { formatStatValue } = await import('@shared/widget/theme.js');

  expect(formatStatValue(24_351, 155, 30)).toBe('24,351');
  expect(formatStatValue(24_351, 63, 22.5)).toBe('24.4K');
  expect(formatStatValue(2204.316)).toBe('2,204');
  expect(formatStatValue(null)).toBe('—');
});

it('estimates wider text for Cyrillic and bold weights', async () => {
  const { estimateTextWidth } = await import('@shared/widget/geometry.js');
  // Calibrated against the browser: "Смёрджено" at 10.125px/500 renders ~61px wide.
  expect(estimateTextWidth('Смёрджено', 10.125)).toBeCloseTo(61, 0);
  expect(estimateTextWidth('Merged', 10)).toBeLessThan(estimateTextWidth('Смёрджено', 10));
  expect(estimateTextWidth('123', 10, { weight: 800 })).toBeGreaterThan(
    estimateTextWidth('123', 10),
  );
  expect(estimateTextWidth('123', 10, { letterSpacing: -0.06 })).toBeCloseTo(
    estimateTextWidth('123', 10) - 1.8,
  );
});
