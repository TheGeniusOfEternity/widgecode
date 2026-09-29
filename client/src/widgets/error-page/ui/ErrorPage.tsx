import { Button } from '@gravity-ui/uikit';

import type { Locale } from '@/shared/locale/content';
import styles from '@/widgets/error-page/ui/ErrorPage.module.css';

export type ErrorCode = 404 | 500;

const copy = {
  ru: {
    404: {
      eyebrow: 'Ошибка 404',
      title: 'Страница не найдена',
      text: 'Ссылка устарела или в адресе опечатка. Виджет могли удалить или снять с публикации.',
    },
    500: {
      eyebrow: 'Ошибка 500',
      title: 'Что-то пошло не так',
      text: 'Мы не смогли загрузить эту страницу. Попробуйте ещё раз через минуту.',
    },
    home: 'На главную',
    retry: 'Повторить',
  },
  en: {
    404: {
      eyebrow: 'Error 404',
      title: 'Page not found',
      text: 'The link is outdated or the address has a typo. The widget may have been deleted or unpublished.',
    },
    500: {
      eyebrow: 'Error 500',
      title: 'Something went wrong',
      text: "We couldn't load this page. Please try again in a minute.",
    },
    home: 'Go home',
    retry: 'Try again',
  },
} as const;

type ErrorPageProps = {
  code: ErrorCode;
  locale: Locale;
  onHome: () => void;
  onRetry?: () => void;
  /** Extra detail from the failed request, shown under the description. */
  detail?: string | null;
};

export const ErrorPage = ({ code, locale, onHome, onRetry, detail }: ErrorPageProps) => {
  const t = copy[locale];
  return (
    <main className={styles.page} role="alert">
      <div className={styles.card}>
        <span className={styles.code} aria-hidden="true">
          {code}
        </span>
        <p>{t[code].eyebrow}</p>
        <h1>{t[code].title}</h1>
        <span className={styles.text}>{t[code].text}</span>
        {detail && <code className={styles.detail}>{detail}</code>}
        <div className={styles.actions}>
          {onRetry && (
            <Button view="outlined" size="l" onClick={onRetry}>
              {t.retry}
            </Button>
          )}
          <Button view="action" size="l" onClick={onHome}>
            {t.home}
          </Button>
        </div>
      </div>
    </main>
  );
};
