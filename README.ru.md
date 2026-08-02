# WidgeCode

Персональные live-виджеты для GitHub, LeetCode и других источников. Соберите виджет, настройте блоки и опубликуйте его как iframe.

[English](README.md) | Русский

## Возможности

- Галерея персональных виджетов.
- Блоки статистики GitHub, языков и LeetCode.
- Редактор с сеткой, изменением размеров и live-preview.
- Публичные страницы и iframe-встраивание.
- Авторизация по email и через Yandex ID.
- Светлая и тёмная темы.

## Стек

- React 19, TypeScript, Vite.
- Express 5, Prisma и PostgreSQL.
- Gravity UI, Framer Motion и Zustand.

## Быстрый старт

Требования: Node.js 22+, npm и Docker.

```bash
cp .env.example .env
npm install
docker compose -p widgecode up -d
npm run prisma:generate -w server
npm run prisma:migrate -w server
npm run dev
```

После запуска:

- клиент: http://localhost:5173
- API: http://localhost:4000

Для существующей базы данных не запускайте `prisma migrate reset`: команда удаляет все данные. Если PostgreSQL уже запущен на порту `5432`, Docker-контейнер запускать не нужно.

## Команды

```bash
npm run dev
npm run build
npm run typecheck
npm run test
npm run lint
npm run format:check
```

## Структура

- `client/` — React-клиент и UI.
- `server/` — Express API, Prisma-модели и миграции.
- `api/` — Vercel API handlers.

## Лицензия

WidgeCode распространяется на проприетарных условиях. Копирование, распространение, изменение и коммерческое использование без письменного разрешения запрещены. Подробности: [LICENSE](LICENSE).
