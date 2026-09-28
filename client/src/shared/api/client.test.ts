import { ApiError, apiClient, configureApiAuth } from '@/shared/api/client';

const jsonResponse = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

it('refreshes the session once on 401 and retries with the new token', async () => {
  let token = 'expired';
  const refresh = vi.fn(async () => {
    token = 'fresh';
    return true;
  });
  configureApiAuth({ getToken: () => token, refresh });
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse(401, { error: 'expired' }))
    .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
  vi.stubGlobal('fetch', fetchMock);

  await expect(apiClient('/widgets')).resolves.toEqual({ ok: true });

  expect(refresh).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[1][1].headers.authorization).toBe('Bearer fresh');
});

it('does not loop when the retried request is still unauthorized', async () => {
  const refresh = vi.fn(async () => true);
  configureApiAuth({ getToken: () => 'token', refresh });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Nope' })));

  await expect(apiClient('/widgets')).rejects.toMatchObject({ status: 401, message: 'Nope' });
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('skips the refresh for auth endpoints and surfaces non-JSON errors by status', async () => {
  const refresh = vi.fn(async () => true);
  configureApiAuth({ getToken: () => null, refresh });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })));

  const request = apiClient('/auth/login', { method: 'POST', skipAuthRefresh: true });

  await expect(request).rejects.toBeInstanceOf(ApiError);
  await expect(request).rejects.toThrow('Request failed: 500');
  expect(refresh).not.toHaveBeenCalled();
});

it('returns undefined for 204 responses', async () => {
  configureApiAuth({ getToken: () => 'token', refresh: async () => false });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

  await expect(apiClient('/widgets/1', { method: 'DELETE' })).resolves.toBeUndefined();
});
