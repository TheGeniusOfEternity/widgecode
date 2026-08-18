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
      showChrome: false,
    }),
  );

  expect(svg).toContain('<svg');
  expect(svg).toContain('Build &lt;something&gt; worth sharing');
  expect(svg).toContain('widget-surface');
  expect(svg).toContain('widget-shadow');
  expect(svg).toContain('transform="translate(24 24)"');
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
