import { render, screen } from '@testing-library/react';

import { ScaledWidgetFrame } from '@/entities/widget/ui/ScaledWidgetFrame';

const renderWithAvailableWidth = (available: number, maxScale?: number) => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(available);
  render(
    <ScaledWidgetFrame width={600} height={300} maxScale={maxScale}>
      <div data-testid="widget" />
    </ScaledWidgetFrame>,
  );
  const content = screen.getByTestId('widget').parentElement as HTMLElement;
  return { content, frame: content.parentElement as HTMLElement };
};

afterEach(() => {
  vi.restoreAllMocks();
});

it('scales the widget down to the available width without reflowing it', () => {
  const { content, frame } = renderWithAvailableWidth(300);

  expect(content.style.width).toBe('600px');
  expect(content.style.height).toBe('300px');
  expect(content.style.transform).toBe('scale(0.5)');
  expect(frame.style.width).toBe('300px');
  expect(frame.style.height).toBe('150px');
});

it('never scales above maxScale', () => {
  const { content } = renderWithAvailableWidth(1200);
  expect(content.style.transform).toBe('scale(1)');
});
