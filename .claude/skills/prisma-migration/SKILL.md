---
name: prisma-migration
description: Safely change the WidgeCode Prisma schema and create migrations that will run on production via Vercel. Use when editing server/prisma/schema.prisma, adding models/fields/indexes, or when anything mentions migrate, db reset, or database schema.
---

# Prisma migration

Production runs `prisma migrate deploy` in the Vercel build (`vercel.json` → `buildCommand`) for every push to `main`. A committed migration is a production change.

## Rules

- Never run `prisma migrate reset`, `prisma db push --force-reset`, or drop the Docker volume without the user explicitly asking — they delete all local data.
- Never edit an existing migration directory in `server/prisma/migrations/` that is already on `main`; add a new one.
- Destructive changes (drop column/table, type narrowing, making a column required) need a two-step plan: add + backfill in one release, remove in a later one. Ask before proceeding.
- New required columns need a `@default(...)` or a backfill SQL step in the migration.
- Block and widget settings live in JSON (`Widget.config`, `Block.config`) — prefer extending the zod schemas in `server/src/widgets/registry.ts` over a schema migration when the data is per-widget configuration.

## Steps

1. Ensure local Postgres is up: `docker compose -p widgecode up -d` (skip if something already listens on 5432).
2. Edit `server/prisma/schema.prisma`.
3. `npm run prisma:migrate -w server -- --name <snake_case_description>` — review the generated `migration.sql` before continuing.
4. `npm run prisma:generate -w server`.
5. Update Prisma mocks in `server/src/*.test.ts` (`prismaMocks`) if new model methods are called.
6. Run the `verify` skill.
7. Mention the migration in the PR description and in `CHANGELOG.md` if it changes behaviour.
