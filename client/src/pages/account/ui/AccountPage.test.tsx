import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AccountPage } from '@/pages/account/ui/AccountPage';

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));

vi.mock('@/shared/api', () => ({
  API_BASE_URL: '/api',
  apiClient: api.apiClient,
  configureApiAuth: vi.fn(),
  getApiErrorMessage: (error: unknown) => (error instanceof Error ? error.message : 'Error'),
}));

const user = { id: 'user-1', email: 'person@example.com', name: 'Person' };

const mockMe = (methods: { password: boolean; yandex: boolean }, emailVerified = true) =>
  api.apiClient.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/auth/me') return { user, methods, emailVerified };
    if (path === '/auth/features') return { email: true };
    if (path === '/auth/resend-verification') return { ok: true };
    if (path === '/auth/yandex' && init?.method === 'DELETE') {
      return { methods: { ...methods, yandex: false } };
    }
    throw new Error(`Unexpected ${path}`);
  });

beforeEach(() => {
  api.apiClient.mockReset();
  window.history.replaceState({}, '', '/account');
});

it('offers to connect Yandex when only a password is set', async () => {
  mockMe({ password: true, yandex: false });
  render(<AccountPage locale="en" onBack={() => {}} />);

  expect(await screen.findByText('person@example.com')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
});

it('disconnects Yandex when a password remains', async () => {
  mockMe({ password: true, yandex: true });
  render(<AccountPage locale="en" onBack={() => {}} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Disconnect' }));

  await waitFor(() => expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument());
  expect(api.apiClient).toHaveBeenCalledWith('/auth/yandex', { method: 'DELETE' });
});

it('does not allow removing the only sign-in method', async () => {
  mockMe({ password: false, yandex: true });
  render(<AccountPage locale="en" onBack={() => {}} />);

  expect(
    await screen.findByText("This is your only sign-in method, so it can't be disconnected"),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
});

it('shows the link result from the URL once and cleans the address', async () => {
  window.history.replaceState({}, '', '/account?link_error=yandex_taken');
  mockMe({ password: true, yandex: false });
  render(<AccountPage locale="ru" onBack={() => {}} />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Этот Яндекс ID уже привязан к другому аккаунту.',
  );
  expect(window.location.search).toBe('');
});

it('lets an unconfirmed user resend the confirmation email', async () => {
  mockMe({ password: true, yandex: false }, false);
  render(<AccountPage locale="en" onBack={() => {}} />);

  expect(await screen.findByText('Not confirmed')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Send email' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Email sent. Check your inbox.');
  expect(api.apiClient).toHaveBeenCalledWith('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ locale: 'en' }),
  });
});
