import { renderToStaticMarkup } from 'react-dom/server';

import { BLOCK_SIZES, blockVariant } from '@shared/widget/blockSizes.js';
import { WidgetCanvas } from '@shared/widget/WidgetCanvas.js';

const sampleData: Record<string, Record<string, unknown>> = {
  'github-stats': {
    username: 'octocat',
    name: 'The Octocat',
    bio: 'Mascot',
    publicRepositories: 8,
    followers: 4321,
    following: 9,
  },
  'github-langs': {
    username: 'octocat',
    languages: [
      { name: 'TypeScript', percentage: 60 },
      { name: 'Go', percentage: 40 },
    ],
  },
  'github-commits': {
    username: 'octocat',
    commitsYear: 1234,
    currentStreak: 5,
    longestStreak: 20,
    levels: Array(371).fill(2),
    firstDayOfWeek: 0,
  },
  'github-prs': { username: 'octocat', total: 10, merged: 7, open: 1, closed: 2 },
  'github-status': { username: 'octocat', emoji: '🚀', message: 'Shipping', busy: true },
  'leetcode-stats': {
    username: 'tourist',
    ranking: 42,
    contestRating: 3000,
    solved: { all: 600, easy: 300, medium: 200, hard: 100 },
  },
};

// Something each variant must show, proving the right data reached it.
const expectedText: Record<string, (variant: string) => string> = {
  text: () => 'Hello',
  'github-stats': (variant) => (variant === 'tiny' ? '4,321' : 'The Octocat'),
  'github-langs': (variant) => (variant === 'tiny' ? '60%' : 'TypeScript'),
  'github-commits': () => '1,234',
  'github-prs': (variant) => (variant === 'tiny' ? '70%' : '10'),
  'github-status': () => '🚀',
  'leetcode-stats': () => '600',
};

const render = (type: string, width: number, height: number) =>
  renderToStaticMarkup(
    <WidgetCanvas
      blocks={[
        {
          id: 'block',
          type,
          position: 0,
          config: { username: 'octocat', text: 'Hello', layout: { x: 0, y: 0, width, height } },
        },
      ]}
      width={600}
      height={741}
      columns={4}
      renderedBlocks={[{ id: 'block', type, position: 0, data: sampleData[type] ?? {} }]}
    />,
  );

describe.each(Object.entries(BLOCK_SIZES))('%s', (type, sizes) => {
  it.each(sizes.map((size) => [`${size.width}×${size.height}`, size] as const))(
    'renders the %s variant with its data',
    (_label, size) => {
      const svg = render(type, size.width, size.height);
      expect(svg).toContain(expectedText[type](blockVariant(size.width, size.height)));
      expect(svg).not.toContain('NaN');
      expect(svg).not.toContain('undefined');
    },
  );
});
