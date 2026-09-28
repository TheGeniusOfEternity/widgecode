---
name: verify
description: Run WidgeCode's full CI pipeline locally (format, lint, typecheck incl. api/, tests, build, audit) and report failures. Use before finishing any code change, before committing or opening a PR, or when asked to "check", "verify", or "make sure CI passes".
---

# Verify

Mirror `.github/workflows/ci.yml` locally. Run from the repo root, in this order, and stop at the first failing step to fix it before continuing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run typecheck:api
npm audit --audit-level=high
```

Notes:

- `typecheck:api` is not in CI yet but catches breakage in `api/*.ts` (they import `server/dist/src/app.js`); run it whenever server entry points, `server/tsconfig*.json`, or `api/` changed.
- If Prisma types are missing, run `npm run prisma:generate -w server` first (needs `DATABASE_URL`; any syntactically valid URL works for generation).
- Formatting failures: run `npx prettier --write <files>` only on files you touched, not the whole repo.
- For a narrow change you may run a single test first: `npm run test -w server -- src/widgets.test.ts`, but finish with the full sequence.
- Report results honestly: list each step as passed/failed with the relevant output. Moderate audit findings don't fail CI; high ones do.
