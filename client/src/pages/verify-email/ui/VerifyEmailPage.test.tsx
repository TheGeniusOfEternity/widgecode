import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';

import { VerifyEmailPage } from '@/pages/verify-email/ui/VerifyEmailPage';

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock('@/shared/api', () => ({ apiClient: api.apiClient }));

beforeEach(() => {
  api.apiClient.mockReset();
});

it('confirms once even when effects run twice, and clears the token from the URL', async () => {
  window.history.replaceState({}, '', '/verify-email#token=abc123');
  api.apiClient.mockResolvedValue({ ok: true });

  render(
    <StrictMode>
      <VerifyEmailPage locale="en" onContinue={() => {}} />
    </StrictMode>,
  );

  expect(await screen.findByRole('status')).toHaveTextContent('Email confirmed. Thank you!');
  expect(api.apiClient).toHaveBeenCalledTimes(1);
  expect(api.apiClient).toHaveBeenCalledWith('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token: 'abc123' }),
    skipAuthRefresh: true,
  });
  expect(window.location.hash).toBe('');
});

it('explains an invalid link', async () => {
  window.history.replaceState({}, '', '/verify-email#token=expired');
  api.apiClient.mockRejectedValue(new Error('This confirmation link is invalid or has expired'));

  render(<VerifyEmailPage locale="ru" onContinue={() => {}} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Ссылка недействительна');
});
