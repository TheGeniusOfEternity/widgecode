---
name: add-block-type
description: Checklist for adding a new widget block type to WidgeCode (e.g. GitHub commits, pull requests, GitHub status, new data source) across server registry, stats fetching, SVG export, client editor/canvas, locales, and tests. Use whenever a new block, block option, or data source is being added.
argument-hint: '[block-type-id]'
---

# Add a block type

A block type exists in several places that are not linked by types. Miss one and the block will
validate on the server but render blank in the editor, or render in the editor but not in the SVG export.

## 1. Server registry — `server/src/widgets/registry.ts` (source of truth)

- Add the id to `BLOCK_TYPES` (kebab-case, prefixed by source: `github-…`, `leetcode-…`). `getSourceForBlock` infers the source from that prefix.
- For a new source: add it to `SOURCE_TYPES` and to `widgetConfigSchema.sources`.
- Add a zod schema to `blockSchemas`: every option needs a `.default(...)`; spread `...sharedBlockFields` (layout); use `usernameSchema` for the account name.
- Optionally add a preset to `presetDefinitions`.

## 2. Data — `server/src/services/statsService.ts`

- Add a fetcher wrapped in `getCached(key, loader)`; key format `source:username:what`.
- Use `fetchJson` (sets UA, maps rate limits to `AppError(502)`); send `githubHeaders()` for GitHub.
- Return a small, flat, JSON-serialisable object — it is sent to the browser and rendered into the SVG.
- Branch on the new type in `getBlockData`. Throw `AppError` for "not found"; `renderWidgetStats` turns errors into `block.error`.
- Mind the budget: public SVG/iframe views call this per request (15 min cache per instance). Prefer one API call per block.

## 3. SVG export — `server/src/shared/widget/WidgetCanvas.tsx`

- Add a block renderer in `BlockContent` next to the existing ones. Use the `frame` (content width/height + `blockTypography`), `baseline()`, `fitText`, `StatsRow`/`TitleRow` helpers — no hard-coded font sizes.
- Put new labels in `server/src/shared/widget/theme.ts` (`widgetLabels`, ru + en) so both renderers share them.
- Handle loading/`error`/empty data states like the other blocks.
- Any image must be a data URI (see `buildAvatarDataUris` in `widgetController.ts`) — external `href`s don't load when the SVG is used as `<img>` on GitHub.

## 4. Client — `client/src/entities/widget/`

- `model/types.ts`: extend `BlockType` and the rendered data types.
- `model/registry.ts`: labels + ru/en descriptions, presets mirror.
- `ui/WidgetCanvas.tsx` + `.module.css`: add `sampleData[type]` (shown before live data) and the HTML renderer, mirroring the SVG element order and using only the `--block-*` custom properties — see the `widget-render-parity` skill.
- `pages/widget-editor/ui/WidgetEditorPage.tsx`: block palette entry and settings controls for each option.
- `shared/locale/content.ts`: all new strings in both `ru` and `en`.

## 5. Tests and docs

- `server/src/widgets.test.ts`: creating/updating a widget with the new block validates; bad config → 400.
- `server/src/statsService.test.ts`: mock `fetch`, assert the mapped shape and cache key.
- `server/src/services/widgetCanvas.test.ts`: SVG renders the block without throwing and contains expected text.
- `CHANGELOG.md` → `[Unreleased] / Added`. Update `README*.md` feature list if it's user-visible.
- Finish with the `verify` skill.

No Prisma migration is needed: block config is stored as JSON in `Block.config`.
