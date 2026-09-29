import { fireEvent, render, screen } from '@testing-library/react';

import { ErrorPage } from '@/widgets/error-page/ui/ErrorPage';

it('explains a 404 and offers the way home only', () => {
  const onHome = vi.fn();
  render(<ErrorPage code={404} locale="ru" onHome={onHome} />);

  expect(screen.getByRole('heading')).toHaveTextContent('Страница не найдена');
  expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'На главную' }));
  expect(onHome).toHaveBeenCalled();
});

it('shows the failure detail and a retry action for a 500', () => {
  const onRetry = vi.fn();
  render(<ErrorPage code={500} locale="en" onHome={() => {}} onRetry={onRetry} detail="Timeout" />);

  expect(screen.getByText('Timeout')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalled();
});
