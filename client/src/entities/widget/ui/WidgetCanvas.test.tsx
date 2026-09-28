import { render, screen } from '@testing-library/react';

import type { WidgetBlock } from '@/entities/widget/model';
import { WidgetCanvas } from '@/entities/widget/ui/WidgetCanvas';

const githubBlock: WidgetBlock = {
  id: 'gh',
  type: 'github-stats',
  position: 0,
  config: { username: 'octocat', layout: { x: 0, y: 0, width: 1, height: 1 } },
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
  expect(screen.getByText('Подписчики')).toBeInTheDocument();
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
  const canvas = container.firstElementChild as HTMLElement;

  expect(canvas).toHaveAttribute('data-palette-mode', 'dark');
  expect(canvas.style.getPropertyValue('--widget-width')).toBe('600px');
  expect(canvas.style.getPropertyValue('--widget-height')).toBe('315px');
});

it('asks for a username before a data block can load', () => {
  render(
    <WidgetCanvas
      blocks={[{ ...githubBlock, config: { layout: githubBlock.config.layout } }]}
      palette="lavender"
      locale="en"
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent('Add a GitHub username in block settings');
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
