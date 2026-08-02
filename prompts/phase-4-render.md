# Phase 4: Render & Export

## Goals
- Публичный endpoint для данных и рендера виджета
- Возможность встраивания через iframe
- Генерация embed-кода на клиенте

## Текущее состояние
- Публичная страница доступна по `/w/:slug`.
- Данные и ошибки блоков рендерятся на сервере через `renderWidgetStats`.
- Клиент отображает `WidgetCanvas`, а не серверный HTML/SVG.
- Для GitHub API поддерживается `GITHUB_TOKEN` для authenticated rate limit.

## Server

### GET /api/public/widgets/:slug (public)
- Принимает `slug` виджета
- Проверяет, что виджет существует и `public = true`
- Загружает виджет + все блоки (отсортированные по position)
- Загружает данные каждого блока через stats service
- Возвращает `{ widget, rendered: { blocks, cacheTtlSeconds } }`

### Stats renderer
`server/src/services/statsService.ts` получает данные для `github-stats`, `github-langs` и `leetcode-stats`, кэширует ответы на 15 минут и возвращает данные или block-level error.

### GitHub API integration
Для `github-stats` и `github-langs` блоков:
REST API: `https://api.github.com/users/{username}` и `/repos`.

Без токена лимит быстро исчерпывается. Для live preview рекомендуется `GITHUB_TOKEN` в `.env` и Vercel Environment Variables.

## Client

### Public widget page (`/w/:slug`)
- Простая страница с рендером виджета
- Загружает public payload через `/api/public/widgets/:slug`.
- Во время загрузки показывает `AuthTransitionLoader`.

### Widget visibility toggle
- На странице редактора — чекбокс "Публичный" (save → `widget.public`)
- Если непубличный — render endpoint возвращает 404 или заглушку

### Embed code generator
В редакторе кнопка "Embed" → код с публичным slug:
```html
<iframe src="https://yourdomain.com/w/WIDGET_SLUG"
  width="600" height="400" frameborder="0"></iframe>
```

## Проверка
- [x] Публичный виджет рендерится по `/api/public/widgets/:slug`
- [x] Приватный виджет → 404
- [x] iframe-код корректно генерируется на клиенте
- [x] GitHub stats/langs блоки тянут реальные данные при настроенном `GITHUB_TOKEN`
- [x] LeetCode stats block использует актуальный GraphQL query
