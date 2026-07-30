export type AppTheme = 'light' | 'dark';
export type Locale = 'ru' | 'en';

export const APP_THEME_STORAGE_KEY = 'app-theme';
export const APP_LOCALE_STORAGE_KEY = 'app-locale';

export const getSystemTheme = (): AppTheme =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const getSystemLocale = (): Locale =>
  navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
