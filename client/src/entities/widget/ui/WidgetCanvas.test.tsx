import { render, screen } from '@testing-library/react';

import type { WidgetBlock } from '@/entities/widget/model';
import { WidgetCanvas } from '@/entities/widget/ui/WidgetCanvas';

const githubBlock: WidgetBlock = {
  id: 'gh',
  type: 'github-stats',
  position: 0,
  config: { username: 'octocat', layout: { x: 0, y: 0, width: 2, height: 2 } },
};

const renderedGithub = {
  id: 'gh',
  type: 'github-stats' as const,
  position: 0,
  data: {
    username: 'octocat',
    name: 'The Octocat',
    publicRepositories: 8,
    followers: 24_351,
    following: 9,
  },
};

it('renders live stats with localized labels and fits long numbers', () => {
  render(
    <WidgetCanvas
      blocks={[githubBlock]}
      palette="lavender"
      renderedBlocks={[renderedGithub]}
      locale="ru"
    />,
  );

  expect(screen.getByText('The Octocat')).toBeInTheDocument();
  // Labels are cut to the stat column like in the SVG export.
  expect(screen.getAllByText(/^Подпис/)).toHaveLength(2);
  // A 1-column block is too narrow for "24,351" at stat size, so it switches to compact.
  expect(screen.getByText('24.4K')).toBeInTheDocument();
});

it('renders at the stored widget size with the palette mode applied', () => {
  const { container } = render(
    <WidgetCanvas
      blocks={[githubBlock]}
      palette="mint"
      paletteMode="dark"
      width={600}
      height={315}
    />,
  );
  const surface = container.firstElementChild as HTMLElement;

  expect(surface.style.width).toBe('600px');
  expect(surface.style.height).toBe('315px');
  // Mint, dark mode.
  expect(surface.style.getPropertyValue('--widget-accent')).toBe('#73d9b8');
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 600 315');
});

it('asks for a username before a data block can load', () => {
  render(
    <WidgetCanvas
      blocks={[{ ...githubBlock, config: { layout: githubBlock.config.layout } }]}
      palette="lavender"
      locale="en"
    />,
  );

  expect(screen.getByText('Add a username')).toBeInTheDocument();
});

it('shows block errors instead of data', () => {
  render(
    <WidgetCanvas
      blocks={[githubBlock]}
      palette="lavender"
      renderedBlocks={[{ id: 'gh', type: 'github-stats', position: 0, error: 'Rate limited' }]}
    />,
  );

  expect(screen.getByText('Rate limited')).toBeInTheDocument();
});

it('shows the empty state without blocks', () => {
  render(<WidgetCanvas blocks={[]} palette="lavender" locale="ru" />);
  expect(screen.getByText('Добавьте блок, чтобы начать.')).toBeInTheDocument();
});

describe('GitHub activity, pull request and status blocks', () => {
  const block = (id: string, type: WidgetBlock['type'], config = {}, width = 2): WidgetBlock => ({
    id,
    type,
    position: 0,
    config: { username: 'octo', layout: { x: 0, y: 0, width, height: 2 }, ...config },
  });

  it('draws as many heatmap weeks as fit the block width', () => {
    const levels = Array(371).fill(1);
    const rendered = (id: string) => ({
      id,
      type: 'github-commits' as const,
      position: 0,
      data: { username: 'octo', commitsYear: 5, currentStreak: 1, longestStreak: 2, levels },
    });
    const { container, rerender } = render(
      <WidgetCanvas
        blocks={[block('narrow', 'github-commits')]}
        palette="lavender"
        renderedBlocks={[rendered('narrow')]}
      />,
    );
    // 2-column block: (244 + 3) / 13 → 19 weeks.
    expect(container.querySelectorAll('rect[width="10"][height="10"]')).toHaveLength(19 * 7);

    rerender(
      <WidgetCanvas
        blocks={[block('wide', 'github-commits', {}, 4)]}
        palette="lavender"
        renderedBlocks={[rendered('wide')]}
      />,
    );
    // Full-width block: (526 + 3) / 13 → 40 weeks.
    expect(container.querySelectorAll('rect[width="10"][height="10"]')).toHaveLength(40 * 7);
  });

  it('hides streaks and the heatmap when turned off', () => {
    const { container } = render(
      <WidgetCanvas
        blocks={[block('c', 'github-commits', { showStreak: false, showHeatmap: false })]}
        palette="lavender"
        locale="ru"
        renderedBlocks={[
          {
            id: 'c',
            type: 'github-commits',
            position: 0,
            data: { username: 'octo', commitsYear: 5, levels: [1, 2, 3] },
          },
        ]}
      />,
    );
    expect(screen.getByText('Коммиты')).toBeInTheDocument();
    expect(screen.queryByText('Дней подряд')).not.toBeInTheDocument();
    expect(container.querySelector('rect[width="10"][height="10"]')).toBeNull();
  });

  it('shows the pull request breakdown in percent', () => {
    render(
      <WidgetCanvas
        blocks={[block('p', 'github-prs')]}
        palette="lavender"
        renderedBlocks={[
          {
            id: 'p',
            type: 'github-prs',
            position: 0,
            data: { username: 'octo', total: 10, merged: 7, open: 1, closed: 2 },
          },
        ]}
      />,
    );
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('shows the status or an empty state', () => {
    const { rerender } = render(
      <WidgetCanvas
        blocks={[block('s', 'github-status')]}
        palette="lavender"
        renderedBlocks={[
          {
            id: 's',
            type: 'github-status',
            position: 0,
            data: { username: 'octo', emoji: '🌴', message: 'On vacation', busy: true },
          },
        ]}
      />,
    );
    expect(screen.getByText('🌴')).toBeInTheDocument();
    expect(screen.getByText('On vacation')).toBeInTheDocument();
    expect(screen.getByText('Busy')).toBeInTheDocument();

    rerender(
      <WidgetCanvas
        blocks={[block('s', 'github-status')]}
        palette="lavender"
        renderedBlocks={[
          {
            id: 's',
            type: 'github-status',
            position: 0,
            data: { username: 'octo', emoji: null, message: null, busy: false },
          },
        ]}
      />,
    );
    expect(screen.getByText('No status set')).toBeInTheDocument();
  });
});
