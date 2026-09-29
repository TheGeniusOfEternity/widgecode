import { ThemeProvider } from '@gravity-ui/uikit';
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';

import { ForgotPasswordPage } from '@/pages/password-reset/ui/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/password-reset/ui/ResetPasswordPage';

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock('@/shared/api', () => ({
  apiClient: api.apiClient,
  getApiErrorMessage: (error: unknown) => (error instanceof Error ? error.message : 'Error'),
}));

// Gravity inputs read the theme from context.
const render = (ui: ReactElement) => rtlRender(<ThemeProvider theme="light">{ui}</ThemeProvider>);

const fill = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

beforeEach(() => {
  api.apiClient.mockReset();
});

it('requests a reset link and shows a neutral confirmation', async () => {
  api.apiClient.mockResolvedValue({ ok: true });
  render(<ForgotPasswordPage locale="en" onBackToSignin={() => {}} />);

  fill('Email', 'person@example.com');
  fireEvent.click(screen.getByRole('button', { name: 'Send link' }));

  expect(await screen.findByRole('status')).toHaveTextContent(
    'If an account with this email exists',
  );
  expect(api.apiClient).toHaveBeenCalledWith('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'person@example.com', locale: 'en' }),
    skipAuthRefresh: true,
  });
});

describe('ResetPasswordPage', () => {
  it('checks that both passwords match before calling the API', async () => {
    window.history.replaceState({}, '', '/reset-password#token=tok');
    render(<ResetPasswordPage locale="en" onDone={() => {}} onRequestNewLink={() => {}} />);

    fill('New password', 'secret123');
    fill('Repeat password', 'secret124');
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Passwords don't match");
    expect(api.apiClient).not.toHaveBeenCalled();
  });

  it('saves the new password with the token from the link', async () => {
    window.history.replaceState({}, '', '/reset-password#token=tok');
    api.apiClient.mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    render(<ResetPasswordPage locale="en" onDone={onDone} onRequestNewLink={() => {}} />);

    fill('New password', 'secret123');
    fill('Repeat password', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.apiClient).toHaveBeenCalledWith('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'tok', password: 'secret123' }),
      skipAuthRefresh: true,
    });
  });

  it('offers a new link when opened without a token', () => {
    window.history.replaceState({}, '', '/reset-password');
    const onRequestNewLink = vi.fn();
    render(<ResetPasswordPage locale="en" onDone={() => {}} onRequestNewLink={onRequestNewLink} />);

    expect(screen.getByRole('alert')).toHaveTextContent('This link is invalid or has expired');
    fireEvent.click(screen.getByRole('button', { name: 'Send link' }));
    expect(onRequestNewLink).toHaveBeenCalled();
  });
});
