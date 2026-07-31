import { create } from 'zustand';

import { apiClient, configureApiAuth, getApiErrorMessage } from '../../../shared/api';

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refresh: () => Promise<boolean>;
  completeOAuth: (token: string) => Promise<void>;
  clearError: () => void;
};

let refreshPromise: Promise<boolean> | null = null;
let checkAuthPromise: Promise<void> | null = null;

const applyAuthResponse = (set: (state: Partial<AuthState>) => void, response: AuthResponse) => {
  set({ token: response.accessToken, user: response.user, status: 'authenticated', error: null });
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  status: 'idle',
  error: null,

  login: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      const response = await apiClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuthRefresh: true,
      });
      applyAuthResponse(set, response);
    } catch (error) {
      set({ status: 'unauthenticated', error: getApiErrorMessage(error) });
      throw error;
    }
  },

  register: async (email, password, name) => {
    set({ status: 'loading', error: null });
    try {
      const response = await apiClient<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name: name || undefined }),
        skipAuthRefresh: true,
      });
      applyAuthResponse(set, response);
    } catch (error) {
      set({ status: 'unauthenticated', error: getApiErrorMessage(error) });
      throw error;
    }
  },

  refresh: async () => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const response = await apiClient<AuthResponse>('/auth/refresh', {
          method: 'POST',
          skipAuthRefresh: true,
        });
        applyAuthResponse(set, response);
        return true;
      } catch {
        set({ token: null, user: null, status: 'unauthenticated' });
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  checkAuth: async () => {
    if (checkAuthPromise) return checkAuthPromise;

    checkAuthPromise = (async () => {
      set({ status: 'loading', error: null });
      await get().refresh();
      if (get().status !== 'authenticated') {
        set({ status: 'unauthenticated' });
      }
    })().finally(() => {
      checkAuthPromise = null;
    });

    return checkAuthPromise;
  },

  completeOAuth: async (token) => {
    set({ token, status: 'loading', error: null });
    try {
      const response = await apiClient<{ user: AuthUser }>('/auth/me');
      set({ token, user: response.user, status: 'authenticated' });
    } catch (error) {
      set({ token: null, user: null, status: 'unauthenticated', error: getApiErrorMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST', skipAuthRefresh: true });
    } finally {
      set({ token: null, user: null, status: 'unauthenticated', error: null });
    }
  },

  clearError: () => set({ error: null }),
}));

configureApiAuth({
  getToken: () => useAuthStore.getState().token,
  refresh: () => useAuthStore.getState().refresh(),
});
