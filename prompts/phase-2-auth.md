# Phase 2: Authentication

## Goals
- Регистрация и логин по email + password
- Yandex OAuth
- JWT-токены (access + refresh)
- Защита роутов на клиенте

## Текущее состояние
- Access token хранится в Zustand в памяти.
- Refresh token хранится в HttpOnly cookie.
- API-клиент автоматически добавляет access token и повторяет запрос после refresh.
- Yandex OAuth реализован через `/api/auth/yandex` и callback.

## Server

### Зависимости
- `jsonwebtoken` — генерация/верификация JWT
- `bcryptjs` — хеширование паролей
- `zod` — валидация входных данных
- Ручной Yandex OAuth flow через `fetch`, без Passport.

### Prisma (уже есть)
Модель User готова. Добавить индекс по `yandexId`, если нет.

### Auth middleware
```ts
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Auth routes (`/api/auth`)

**POST /register**
- Body: `{ email, password }`
- Validate: email format, password >= 6 chars
- Hash password with bcryptjs
- Create user in DB
- Return JWT

**POST /login**
- Body: `{ email, password }`
- Find user by email
- Compare password with bcryptjs
- Return JWT

**GET /yandex**
- Редирект на Yandex OAuth URL
- Query params: `client_id`, `redirect_uri`, `response_type=code`

**GET /yandex/callback**
- Принять `code` из query
- Обменять на токен (POST https://oauth.yandex.ru/token)
- Получить email/userinfo (GET https://login.yandex.ru/info)
- Найти или создать пользователя по `yandexId`
- Вернуть JWT и редирект на фронт

**GET /me** (protected)
- Вернуть данные текущего пользователя (`req.userId`)

### JWT utils
```ts
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
};
```

## Client

### Страницы
- `/login` — форма логина
- `/register` — форма регистрации
- `/dashboard` — защищённый роут (только для авторизованных)

### Auth store (Zustand)
```ts
interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

### API client
```ts
Используется собственный `apiClient` на базе `fetch`: он добавляет Bearer access token, обновляет его через `/auth/refresh` и повторяет исходный запрос.
```

### PrivateRoute
`App` проверяет auth status при bootstrap и перенаправляет защищённые `/dashboard` и `/widgets/:id` на `/login`.

### Yandex OAuth flow
- Кнопка "Войти через Яндекс" → редирект на `/api/auth/yandex`
- После callback — редирект обратно на `/dashboard` с JWT в query или сохранить через redirect

## Проверка
- [x] Регистрация email + password → access/refresh session
- [x] Логин → access/refresh session
- [x] Невалидный JWT → 401
- [x] `/api/auth/me` с валидным JWT → данные пользователя
- [x] Yandex OAuth: кнопка → redirect → callback → access token
- [x] `/dashboard` без токена → redirect на `/login`
