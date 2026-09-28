import { widgetEmbedCode } from '@/entities/widget/lib/embedCode';

const widget = { slug: 'gh-stats', title: 'My "stats" <widget>', width: 600, height: 315 };

it('builds an iframe snippet with the stored size', () => {
  expect(widgetEmbedCode(widget, 'iframe', 'en')).toBe(
    `<iframe src="${window.location.origin}/w/gh-stats?embed=1&amp;width=600&amp;height=315" width="600" height="315" style="display:block;border:0" loading="lazy"></iframe>`,
  );
});

it('builds an SVG image snippet with an escaped alt and the locale', () => {
  expect(widgetEmbedCode(widget, 'svg', 'ru')).toBe(
    `<img src="${window.location.origin}/api/public/widgets/gh-stats/image.svg?locale=ru" alt="My &quot;stats&quot; &lt;widget&gt;" width="600" height="315" />`,
  );
});
