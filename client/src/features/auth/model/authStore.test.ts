import { useAuthStore } from '@/features/auth/model/authStore';

const user = { id: 'user-1', email: 'person@example.com', name: 'Person' };

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, status: 'idle', error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('shares one refresh request between concurrent callers', async () => {
  let resolveFetch: (response: Response) => void = () => {};
  const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve)));
  vi.stubGlobal('fetch', fetchMock);

  const first = useAuthStore.getState().refresh();
  const second = useAuthStore.getState().refresh();
  resolveFetch(
    new Response(JSON.stringify({ accessToken: 'token', user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(useAuthStore.getState()).toMatchObject({ token: 'token', user, status: 'authenticated' });
});

it('marks the session unauthenticated when refresh fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

  await useAuthStore.getState().checkAuth();

  expect(useAuthStore.getState()).toMatchObject({ token: null, status: 'unauthenticated' });
});

it('keeps the error message and rethrows on failed login', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 }),
      ),
  );

  await expect(useAuthStore.getState().login('person@example.com', 'wrong')).rejects.toThrow(
    'Invalid email or password',
  );
  expect(useAuthStore.getState()).toMatchObject({
    status: 'unauthenticated',
    error: 'Invalid email or password',
  });
});
