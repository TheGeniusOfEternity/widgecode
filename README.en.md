# WidgeCode

Personal live widgets for GitHub, LeetCode, and other sources. Build a widget, configure its blocks, and publish it as an iframe.

[Русский](README.md) | English

## Features

- Personal widget gallery.
- GitHub, language, and LeetCode statistics blocks.
- Grid editor with resizing and live preview.
- Public pages and iframe embeds.
- Email and Yandex ID authentication.
- Light and dark themes.

## Stack

- React 19, TypeScript, Vite.
- Express 5, Prisma, and PostgreSQL.
- Gravity UI, Framer Motion, and Zustand.

## Quick Start

Requirements: Node.js 22+, npm, and Docker.

```bash
cp .env.example .env
npm install
docker compose -p widgecode up -d
npm run prisma:generate -w server
npm run prisma:migrate -w server
npm run dev
```

After startup:

- client: http://localhost:5173
- API: http://localhost:4000

Do not run `prisma migrate reset` against an existing database: it deletes all data. If PostgreSQL is already running on port `5432`, Docker does not need to start another database container.

## Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run test
npm run lint
npm run format:check
```

## Structure

- `client/` — React client and UI.
- `server/` — Express API, Prisma models, and migrations.
- `api/` — Vercel API handlers.

## License

WidgeCode is distributed under proprietary terms. Copying, distribution, modification, and commercial use without written permission are prohibited. See [LICENSE](LICENSE).
