---
name: add-block-type
description: Checklist for adding a new widget block type to WidgeCode (e.g. GitHub commits, pull requests, GitHub status, new data source) across server registry, stats fetching, the shared SVG renderer, client editor, locales, and tests. Use whenever a new block, block option, or data source is being added.
argument-hint: '[block-type-id]'
---

# Add a block type

A block type exists in several places that are not linked by types. Miss one and the block will
validate on the server but render as a blank box. Rendering itself is written once: the browser and
the `/image.svg` export use the same SVG components.

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

## 3. Rendering — `server/src/shared/widget/BlockContent.tsx` (used everywhere)

- Add a block renderer in `BlockContent` next to the existing ones. Use the `frame` (content width/height + `blockTypography`), `baseline()`, `fitText`, `StatsRow`/`TitleRow` helpers — no hard-coded font sizes.
- Primitives live in `svgPrimitives.tsx`; the block shell and canvas pieces in `canvasParts.tsx`.
- Put new labels in `server/src/shared/widget/theme.ts` (`widgetLabels`, ru + en).
- Loading (`BlockSkeleton`), `error` and missing-username states are handled before the type switch; make sure the new block doesn't bypass them.
- Images: the export needs data URIs (see `buildAvatarDataUris` in `widgetController.ts`) because external `href`s don't load when the SVG is used as `<img>` on GitHub; in the browser the URL is used directly.

## 4. Client — `client/src/entities/widget/`

- `model/types.ts`: extend `BlockType` and the rendered data types.
- `model/registry.ts`: labels + ru/en descriptions, presets mirror.
- `pages/widget-editor/ui/WidgetEditorPage.tsx`: block palette entry and settings controls for each option.
- `shared/locale/content.ts`: all new strings in both `ru` and `en`.

## 5. Tests and docs

- `server/src/widgets.test.ts`: creating/updating a widget with the new block validates; bad config → 400.
- `server/src/statsService.test.ts`: mock `fetch`, assert the mapped shape and cache key.
- `server/src/services/widgetCanvas.test.ts`: SVG renders the block without throwing and contains expected text; `client/src/entities/widget/ui/WidgetCanvas.test.tsx` for browser-only states if any.
- `CHANGELOG.md` → `[Unreleased] / Added`. Update `README*.md` feature list if it's user-visible.
- Finish with the `verify` skill.

No Prisma migration is needed: block config is stored as JSON in `Block.config`.
