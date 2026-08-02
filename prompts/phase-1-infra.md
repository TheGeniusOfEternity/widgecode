# Phase 1: Infrastructure Setup

## Goals
1. Очистить проект от существующего Vue-кода
2. Настроить монорепозиторий (npm workspaces)
3. Инициализировать React + Vite + TypeScript в `client/`
4. Инициализировать Express + TypeScript + Prisma в `server/`
5. Настроить PostgreSQL и Prisma migrations
6. Проверить, что всё собирается

## Steps

### 1. Очистка
- Удалить `src/` (весь Vue-код)
- Удалить `stats.html`, `langs.html`
- Удалить `public/` (содержимое, кроме favicon по желанию)
- Удалить `dist/`
- Удалить Vue-зависимости из package.json
- Удалить Vue-специфичные конфиги (`vite.config.ts`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.mts`)

### 2. Root package.json (npm workspaces)
```json
{
  "name": "github-stats",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev -w client\" \"npm run dev -w server\"",
    "build": "npm run build -w client && npm run build -w server"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "typescript": "^5.7.0"
  }
}
```

### 3. Client (React + Vite)
```bash
cd client
npm create vite@latest . -- --template react-ts
```

Установить зависимости:
- react, react-dom
- @gravity-ui/uikit, @gravity-ui/icons
- framer-motion
- zustand

vite.config.ts — настроить proxy на сервер:
```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
})
```

### 4. Server (Express + Prisma)
```bash
mkdir server && cd server
npm init -y
```

Установить:
- express, cors, helmet, morgan
- @prisma/client, prisma (dev)
- jsonwebtoken, bcryptjs
- Ручной Yandex OAuth через `fetch`
- zod (валидация)
- dotenv
- tsx, @types/*

tsconfig.json — extends `../tsconfig.base.json`

### 5. Prisma schema
Создать `prisma/schema.prisma` и применять изменения отдельными migrations.

### 6. PostgreSQL
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: widget_user
      POSTGRES_PASSWORD: widget_pass
      POSTGRES_DB: widget_db
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 7. .env
```
DATABASE_URL=postgresql://widget_user:widget_pass@localhost:5432/widget_db
JWT_SECRET=super-secret-key
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
```

### 8. Server entry point
```ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(4000, () => {
  console.log('Server on http://localhost:4000');
});
```

## Текущее состояние
- React + Vite + TypeScript настроены в `client/`.
- Express + TypeScript + Prisma настроены в `server/`.
- Используются npm workspaces и `package-lock.json`.
- API-функции Vercel используют собранный server bundle.
- Prisma migrations применяются через `npm run prisma:deploy -w server`.

## Проверка
- [ ] `npm install` — все зависимости установлены
- [ ] `npm run prisma:deploy -w server` — схема применена
- [ ] `npm run dev` — клиент на 5173, сервер на 4000
- [ ] `curl http://localhost:4000/api/health` → `{"status":"ok"}`
