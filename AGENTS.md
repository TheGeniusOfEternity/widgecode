# AGENTS.md

Guidance for AI coding agents (Claude Code, OpenCode, Codex, etc.) working in this repository.

## Project

WidgeCode — personal live widgets for GitHub and LeetCode stats. Users build a widget from blocks
on a grid, publish it, and embed it as an iframe or as a live SVG image (`/api/public/widgets/:slug/image.svg`).

- npm workspaces monorepo: `client/` (React 19 + Vite), `server/` (Express 5 + Prisma + PostgreSQL), `api/` (Vercel function entry points).
- Node.js 22+, TypeScript ~5.9, ESM everywhere (`"type": "module"`).
- UI: Gravity UI, Framer Motion, Zustand, CSS Modules. No Tailwind, no shadcn.
- Deployed on Vercel (Hobby plan). Production deploys only from `main`.
- Proprietary license — do not add code copied from incompatible sources.

## Commands

Run from the repo root.

```bash
npm run dev            # client :5173 + server :4000 (Vite proxies /api → :4000)
npm run typecheck      # client (tsc -b) + server
npm run typecheck:api  # builds server, then typechecks api/ against server/dist
npm run lint           # eslint .
npm run format:check   # prettier --check .
npm run test           # vitest (client: jsdom, server: node)
npm run build          # client + server
npm run test -w server -- src/widgets.test.ts   # single test file
```

Database (local Postgres via `docker compose -p widgecode up -d`):

```bash
npm run prisma:generate -w server
npm run prisma:migrate -w server   # prisma migrate dev — creates a new migration
```

**Never run `prisma migrate reset` or `prisma db push --force-reset`** — they wipe data. Vercel runs
`prisma migrate deploy` on every production build, so every committed migration hits prod.

CI (`.github/workflows/ci.yml`) runs: `format:check` → `lint` → `typecheck` → `test` → `build` → `npm audit --audit-level=high`.
Before declaring work done, run the same sequence (the `verify` skill does this).

## Layout

```
api/                     Vercel functions. Each file = one serverless function importing
                         server/dist/src/app.js. Hobby plan caps function count — do NOT add
                         new files here; route new endpoints through api/widgets-resource.ts
                         + a rewrite in vercel.json.
server/src/
  app.ts                 createApp(): helmet, cors, json, cookies, routers, error middleware
  index.ts               local entry (loads .env via lib/env.ts, listens unless VERCEL)
  routes/                express routers (auth, widgets, blocks, public widgets, health)
  controllers/           request parsing (zod) + response shaping
  services/              business logic: authService, widgetService, statsService (GitHub/LeetCode fetch + in-memory cache)
  models/                Prisma data access (auth only so far)
  widgets/registry.ts    SOURCE OF TRUTH for block types, palettes, layout limits, presets, zod schemas
  shared/widget/         code shared with the client (SVG WidgetCanvas, languageColor). Imported as `@shared/*`
  lib/                   env, jwt, prisma singleton, AppError
server/prisma/           schema.prisma + migrations
client/src/              Feature-Sliced Design: app → pages → widgets → features → entities → shared
  entities/widget/       widget types, presets, palettes (mirror server registry) and the HTML/CSS WidgetCanvas used in editor/iframe
  pages/widget-editor/   the grid editor: model/ (layout rules, normalizeWidget, useWidgetEditor
                         = load/autosave/save race handling, useGridDrag, useBlockPreviews) + ui/ components
  shared/api/            fetch client with access-token + single-flight refresh
  shared/locale/         ru/en strings (content.ts)
  app/App.tsx            custom pathname-based router (no react-router)
```

Path aliases: client `@/*` → `client/src/*`, both sides `@shared/*` → `server/src/shared/*`, server `@server/*` → `server/src/*`.
Server imports must use `.js` extensions (NodeNext).

## Invariants and gotchas

- **One geometry, two renderers.** All widget numbers (width 600, padding, gap, square cells, block padding, typography scale, palettes, labels, stat formatting) live in `server/src/shared/widget/{geometry,theme}.ts`. The HTML canvas (`client/src/entities/widget/ui/WidgetCanvas.tsx`, used by the editor, public page and iframe) gets them as CSS custom properties via `entities/widget/lib/canvasStyle.ts`; the SVG export (`server/src/shared/widget/WidgetCanvas.tsx`) uses them directly; `widgetService` stores sizes from `widgetDimensions`. The HTML canvas always renders at the stored size and is scaled by `ScaledWidgetFrame` — never add `vw`/`cqi`/`%`-based sizes to it. See the `widget-render-parity` skill.
- **Block types are defined twice.** Server `widgets/registry.ts` (zod schemas, presets) and client `entities/widget/model/{types,registry}.ts` (labels, ru/en descriptions). Adding a block type touches both plus `statsService` and both canvases — use the `add-block-type` skill.
- Limits: `MAX_WIDGET_BLOCKS = 5` in the registry; `MAX_GRID_COLUMNS = 2` and block height ≤ 2 in shared `geometry.ts` (re-exported by the registry). Layout validation (bounds + no overlap) runs in `widgetService.validateLayouts`.
- Widget width is currently fixed at 600 and height is recomputed from rows by `widgetDimensions` on every update — client-supplied `width`/`height` are ignored.
- `statsService` and the avatar cache are per-process in-memory caches; on Vercel each cold instance starts empty. Successful lookups are cached 15 min, failed ones 60 s; the public SVG `Cache-Control` follows the same TTL. Rate limits (`express-rate-limit`, memory store) are also per instance; `trust proxy` is enabled on Vercel so limits are per client IP.
- `api/*.ts` import from `server/dist/src/app.js`. `server/tsconfig.build.json` pins `rootDir: "."` to keep that path stable, and CI runs `typecheck:api` to catch breakage.
- Auth: short-lived access token in memory (Authorization: Bearer), rotating refresh token in an httpOnly cookie scoped to `/api/auth`, sessions stored hashed in `AuthSession`. Yandex OAuth returns the access token in the URL hash of `/auth/callback`. Accounts are keyed by provider id (`yandexId`), never linked by email; linking happens from `/account` (`/api/auth/yandex?intent=link`, the intent is stored with the OAuth state and the callback identifies the user by the refresh cookie).
- Errors: throw `AppError(status, message)` from services; controllers pass errors to `next()`; `errorMiddleware` maps them. Non-AppError → 500 with a generic message.
- All user-visible strings are bilingual (ru/en). Add both.
- `.env` is gitignored; `.env.example` must list every variable the code reads.

## Conventions

- Prettier: 2 spaces, single quotes, trailing commas, width 100 (see `.prettierrc`). ESLint flat config in `eslint.config.ts`.
- Match the surrounding style: arrow-function class members on controllers/services, zod `safeParse` + `AppError(400)`, CSS Modules per component.
- Tests are colocated as `*.test.ts(x)`. Server tests use supertest against `createApp()` with Prisma mocked. Client tests use Testing Library in jsdom (`client/vitest.setup.ts` shims `matchMedia`/`ResizeObserver`); mock `@/shared/api` or stub `fetch` rather than hitting the network. Keep pure logic in `model/` or `lib/` files so it can be tested without rendering.
- Conventional Commits: `feat(scope): …`, `fix(scope): …`, `chore: …`, `docs: …`. Branches: `feature/…`, `fix/…`.
- Update `CHANGELOG.md` under `[Unreleased]` (Keep a Changelog sections: Added / Changed / Fixed / Security) for user-facing changes.
- Don't commit `prompts/`, `.env`, or build output. `prompts/notes.md` is the owner's local backlog — read it for context, don't edit it unless asked.

## Skills

Project skills live in `.claude/skills/`:

| Skill                                                                                        | Use for                                                                 |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `verify`                                                                                     | Run the full CI pipeline locally before finishing a task                |
| `add-block-type`                                                                             | Adding a new widget block (e.g. commits, PRs, GitHub status) end to end |
| `widget-render-parity`                                                                       | Size/padding mismatches between editor, iframe and SVG export           |
| `prisma-migration`                                                                           | Schema changes and safe migrations                                      |
| `release`                                                                                    | Version bump + changelog for a release                                  |
| `ui-ux-pro-max`, `design-system`, `ui-styling`, `brand`, `design`, `banner-design`, `slides` | Generic design skills carried over from OpenCode (claudekit)            |
