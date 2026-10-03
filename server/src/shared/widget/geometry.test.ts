import {
  blockBox,
  blockContentWidth,
  blockTypography,
  canvasPadding,
  cellSize,
  widgetDimensions,
} from '@shared/widget/geometry.js';

it('uses square 267px cells for the default 600px widget', () => {
  expect(canvasPadding(600)).toBe(24);
  expect(cellSize(600)).toBe(267);
  expect(widgetDimensions([{ x: 0, y: 0, width: 1, height: 1 }])).toEqual({
    width: 600,
    height: 315,
  });
  expect(widgetDimensions([{ x: 0, y: 1, width: 2, height: 1 }])).toEqual({
    width: 600,
    height: 600,
  });
});

it('places blocks on the same grid the stored size was computed from', () => {
  const layouts = [
    { x: 0, y: 0, width: 1, height: 1 },
    { x: 1, y: 0, width: 1, height: 2 },
    { x: 0, y: 1, width: 1, height: 1 },
  ];
  const canvas = { ...widgetDimensions(layouts), rows: 2 };

  expect(blockBox(layouts[0], canvas)).toEqual({ x: 24, y: 24, width: 267, height: 267 });
  expect(blockBox(layouts[1], canvas)).toEqual({ x: 309, y: 24, width: 267, height: 552 });
  expect(blockBox(layouts[2], canvas)).toEqual({ x: 24, y: 309, width: 267, height: 267 });
});

it('scales block typography with content width within fixed bounds', () => {
  const half = blockTypography(blockContentWidth(267));
  const full = blockTypography(blockContentWidth(552));

  expect(blockContentWidth(267)).toBe(225);
  expect(half.statValue).toBeCloseTo(22.5);
  expect(full.statValue).toBe(30);
  expect(half.meta).toBeCloseTo(10.125);
  expect(full.meta).toBe(12);
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
