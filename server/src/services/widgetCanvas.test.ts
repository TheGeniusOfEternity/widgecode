import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { WidgetCanvas } from '@shared/widget/WidgetCanvas.js';

it('renders the shared widget canvas as SVG', () => {
  const svg = renderToStaticMarkup(
    createElement(WidgetCanvas, {
      title: 'Shared widget',
      blocks: [
        {
          id: 'block-1',
          type: 'text',
          position: 0,
          config: {
            text: 'Build <something> worth sharing',
            align: 'left',
            layout: { x: 0, y: 0, width: 1, height: 1 },
          },
        },
      ],
      palette: 'lavender',
      paletteMode: 'light',
      columns: 1,
      width: 600,
      height: 400,
      renderedBlocks: [{ id: 'block-1', type: 'text', position: 0, data: {} }],
    }),
  );

  expect(svg).toContain('<svg');
  expect(svg).toContain('Build &lt;something&gt;');
  expect(svg).toContain('sharing');
  expect(svg).toContain('widget-surface');
  // No drop shadow: it would tint the transparent corners around the rounded canvas.
  expect(svg).not.toContain('<filter');
  // Canvas padding 24 + block border 1 + block padding 20.
  expect(svg).toContain('transform="translate(45 45)"');
});

it('scales the SVG viewport without changing the widget viewBox', () => {
  const svg = renderToStaticMarkup(
    createElement(WidgetCanvas, {
      title: 'Scaled widget',
      blocks: [],
      width: 600,
      height: 400,
      outputWidth: 300,
      outputHeight: 200,
    }),
  );

  expect(svg).toContain('width="300" height="200" viewBox="0 0 600 400"');
  expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
});

it('inlines avatars as data URIs instead of external URLs', () => {
  const svg = renderToStaticMarkup(
    createElement(WidgetCanvas, {
      title: 'Avatar widget',
      blocks: [
        {
          id: 'block-1',
          type: 'github-stats',
          position: 0,
          config: { layout: { x: 0, y: 0, width: 1, height: 1 } },
        },
      ],
      palette: 'lavender',
      paletteMode: 'light',
      columns: 1,
      width: 600,
      height: 400,
      renderedBlocks: [
        {
          id: 'block-1',
          type: 'github-stats',
          position: 0,
          data: {
            username: 'octocat',
            name: 'The Octocat',
            avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
            publicRepositories: 8,
            followers: 100,
            following: 9,
          },
        },
      ],
      avatarDataUris: { 'block-1': 'data:image/png;base64,iVBORw0KGgo=' },
    }),
  );

  expect(svg).toContain('href="data:image/png;base64,iVBORw0KGgo="');
  expect(svg).not.toContain('avatars.githubusercontent.com');
});

it('renders the new GitHub blocks with the same geometry as the HTML canvas', async () => {
  const { heatmapWeeks } = await import('@shared/widget/geometry.js');
  const layout = (x: number, y: number, width = 1) => ({ layout: { x, y, width, height: 1 } });
  const svg = renderToStaticMarkup(
    createElement(WidgetCanvas, {
      blocks: [
        { id: 'commits', type: 'github-commits', position: 0, config: layout(0, 0) },
        { id: 'prs', type: 'github-prs', position: 1, config: layout(1, 0) },
        { id: 'status', type: 'github-status', position: 2, config: layout(0, 1, 2) },
      ],
      width: 600,
      height: 600,
      columns: 2,
      renderedBlocks: [
        {
          id: 'commits',
          type: 'github-commits',
          position: 0,
          data: {
            username: 'octo',
            commitsYear: 1200,
            currentStreak: 3,
            longestStreak: 9,
            levels: Array(371).fill(2),
            firstDayOfWeek: 0,
          },
        },
        {
          id: 'prs',
          type: 'github-prs',
          position: 1,
          data: { username: 'octo', total: 10, merged: 7, open: 1, closed: 2 },
        },
        {
          id: 'status',
          type: 'github-status',
          position: 2,
          data: { username: 'octo', emoji: '🚀', message: 'Shipping', busy: true },
        },
      ],
    }),
  );

  // A 1-column block (225px content) fits 17 weeks × 7 days of heatmap cells.
  expect(heatmapWeeks(225)).toBe(17);
  expect(svg.match(/width="10" height="10" rx="2.5"/g)).toHaveLength(17 * 7);
  // "1,200" at 22.5px/800 with -0.06em spacing (~57px) fits the 63px stat column.
  expect(svg).toContain('>1,200<');
  expect(svg).toMatch(/>Merged<\/text>.*?>70%<\/text>/);
  expect(svg).toMatch(/>Closed<\/text>.*?>20%<\/text>/);
  expect(svg).toContain('🚀');
  expect(svg).toContain('Shipping');
  expect(svg).toContain('Busy');
});
