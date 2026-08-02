# Phase 3: Widget Builder

## Goals
- CRUD для виджетов
- CRUD для блоков внутри виджета
- Drag-and-drop конструктор на клиенте
- Система типов блоков (plugin-based)

## Текущее состояние
- Сетка ограничена двумя колонками.
- Каждый блок поддерживает размеры `1x1`, `1x2`, `2x1`, `2x2`.
- Блоки создаются по умолчанию как `1x1`.
- Редактор использует обычный CSS Grid и Pointer Events, без `react-grid-layout` и `@dnd-kit`.
- На mobile редактор заменён desktop-only fallback, а кнопка configure скрыта в галерее.

## Server

### Routes

**`/api/widgets` (protected)**
| Method | Path | Описание |
|--------|------|----------|
| GET | /api/widgets | Список виджетов пользователя |
| POST | /api/widgets | Создать виджет |
| GET | /api/widgets/:id | Виджет с блоками |
| PUT | /api/widgets/:id | Обновить (title, width, height, config, public) |
| DELETE | /api/widgets/:id | Удалить |

**`/api/widgets/:widgetId/blocks` (protected)**
| Method | Path | Описание |
|--------|------|----------|
| POST | /api/widgets/:widgetId/blocks | Добавить блок |
| PUT | /api/blocks/:id | Обновить блок |
| DELETE | /api/blocks/:id | Удалить блок |
| PUT | /api/widgets/:widgetId/blocks/reorder | Пересортировка (body: { blockIds: string[] }) |

**`/api/widgets/:widgetId/preview` (protected)**
| Method | Path | Описание |
|--------|------|----------|
| POST | /api/widgets/:widgetId/preview | Preview актуальных данных одного блока |

### Block types registry
На сервере — enum или маппинг type → validation schema:
```ts
export const BLOCK_TYPES = [
  'text',
  'github-stats',
  'github-langs',
  'leetcode-stats',
] as const;
```

Каждый тип имеет `configSchema` (zod) для валидации config.

### Validation
- Zod schemas для создания и обновления виджетов и блоков
- Проверять, что виджет принадлежит текущему пользователю (сравнение `userId`)

## Client

### Dashboard (`/dashboard`)
- Список виджетов пользователя (карточки)
- Кнопка "Создать виджет" → модалка с названием
- Кнопка "Удалить" с подтверждением
- Клик по виджету → переход в редактор (`/widgets/:id`)

### Widget Editor (`/widgets/:id`)
- **Левая панель**: список доступных блоков для добавления (BlockLibrary)
- **Центр**: canvas виджета с уже добавленными блоками (drag-and-drop sorting)
- **Правая панель**: настройки выбранного блока (конфигурация)

Компоненты:
- `BlockLibrary` — список типов блоков с иконками
- `BlockRenderer` — рендерит блок на canvas (все типы)
- `BlockConfigPanel` — форма настройки выбранного блока (зависит от type)
- `WidgetPreview` — preview виджета в реальном времени

### Типы блоков (компоненты)
```
components/
└── blocks/
    ├── TextBlock.tsx
    ├── GithubStatsBlock.tsx
    ├── GithubLangsBlock.tsx
    └── LeetcodeStatsBlock.tsx
```

В текущей реализации блоки собраны в `entities/widget/ui/WidgetCanvas.tsx`, а редактор использует `WidgetBlockContent` и конфигурационные панели страницы.

Каждый блок получает:
- `config` — настройки блока
- `onConfigChange` — callback при изменении настроек
- `preview` — boolean (режим предпросмотра)

### Drag-and-drop
- `editorBlocks` — CSS Grid с квадратными ячейками и gap.
- Pointer захватывается через drag handle.
- Preview drop-position рассчитывается относительно grid bounds.
- Перед сохранением проверяются границы двух колонок и пересечения блоков.
- Layout сохраняется через `PUT /api/widgets/:widgetId/blocks/reorder`.

### Настройки ресайза
- Width/height виджета (изначально 600x400)
- Размер блока: `1x1`, `1x2`, `2x1`, `2x2`.
- Resize-анимация использует FLIP и корректно деградирует при reduced motion.
- Canvas растёт по содержимому и прокручивается внешним контейнером.

### Live preview
- Editor debounce-запрашивает реальные данные после ввода username.
- Без username показывается fallback с просьбой его указать.
- `/api/widgets/:widgetId/preview` не сохраняет изменения и требует auth.

## Проверка
- [x] Создание виджета → появляется в Dashboard
- [x] Добавление блока → отображается в редакторе
- [x] Drag-and-drop по строкам и колонкам → сохраняется layout
- [x] Редактирование config блока → обновляется live preview
- [x] Удаление блока → исчезает
- [x] Удаление виджета → исчезает из Dashboard
- [x] Чужие виджеты не видны (проверка userId)
