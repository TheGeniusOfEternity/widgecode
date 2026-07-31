const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type AuthApiConfig = {
  getToken: () => string | null;
  refresh: () => Promise<boolean>;
};

type ApiRequestInit = RequestInit & {
  skipAuthRefresh?: boolean;
};

let authApiConfig: AuthApiConfig | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const configureApiAuth = (config: AuthApiConfig) => {
  authApiConfig = config;
};

export const getApiErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

export const apiClient = async <T>(
  path: string,
  init: ApiRequestInit = {},
  isRetry = false,
): Promise<T> => {
  const { skipAuthRefresh, ...requestInit } = init;
  const token = authApiConfig?.getToken();
  const headers = new Headers(requestInit.headers);

  if (!headers.has('Content-Type') && requestInit.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    credentials: 'include',
    headers: {
      ...Object.fromEntries(headers.entries()),
    },
  });

  if (response.status === 401 && authApiConfig && !skipAuthRefresh && !isRetry) {
    const refreshed = await authApiConfig.refresh();
    if (refreshed) return apiClient<T>(path, init, true);
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export { API_BASE_URL };
