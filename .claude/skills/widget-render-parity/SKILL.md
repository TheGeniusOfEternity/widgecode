---
name: widget-render-parity
description: Diagnose and fix size, padding, gap, scale, font, or background differences between the widget in the editor, the public page/iframe, and the exported SVG image, and keep them in sync when changing widget geometry or block visuals. Use for bugs like "widget looks different in SVG", "blocks are smaller in export", "preview scale is off", or any change to block layout/typography.
---

# Widget render parity

## Architecture

| Piece         | File                                                             | Role                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geometry      | `server/src/shared/widget/geometry.ts`                           | Width 600, `canvasPadding` (24), `GRID_GAP` 18, square `cellSize` (267), `BLOCK_PADDING` 20, radii, line heights, `widgetDimensions`, `blockBox`, `blockTypography` |
| Theme         | `server/src/shared/widget/theme.ts`                              | Palettes, language/difficulty colors, ru/en block labels, `formatStatValue`                                                                                         |
| HTML renderer | `client/src/entities/widget/ui/WidgetCanvas.tsx` + `.module.css` | Editor blocks, `/w/:slug`, iframe embed                                                                                                                             |
| HTML bridge   | `client/src/entities/widget/lib/canvasStyle.ts`                  | Turns geometry into CSS custom properties (`canvasStyleVars`, `blockStyleVars`, `blockMetrics`)                                                                     |
| Scaling       | `client/src/entities/widget/ui/ScaledWidgetFrame.tsx`            | Renders the canvas at stored size and scales it to fit (editor, public page)                                                                                        |
| SVG renderer  | `server/src/shared/widget/WidgetCanvas.tsx`                      | `/api/public/widgets/:slug/image.svg`                                                                                                                               |
| Stored size   | `widgetService.widgetDimensions` → shared `widgetDimensions`     | Drives iframe size and SVG viewBox                                                                                                                                  |

Rules:

- A number that affects layout belongs in `geometry.ts` / `theme.ts`, never hard-coded in one renderer.
- The HTML canvas CSS must only use the custom properties — no `vw`, `cqi`, `%` font sizes or media queries. Responsiveness comes from `ScaledWidgetFrame`, not reflow.
- The SVG has no text layout: text widths are estimated (`fitText`, `linesOf`, glyph-width constants). HTML uses `nowrap` + ellipsis on the same elements so both truncate in the same places. `formatStatValue` picks full vs compact numbers from the same estimate in both renderers.
- The SVG uses Inter metrics for baselines (`baseline()`); the HTML canvas sets the same font stack (`WIDGET_FONT_FAMILY`) and `--block-line-height`.

## Changing block visuals

1. Change geometry/typography in `geometry.ts` if a size changes; expose new values in `blockStyleVars` and consume them in the CSS module.
2. Update the HTML markup/CSS and the SVG block renderer in the same change, keeping the element order and gaps identical (the SVG comments name the CSS classes they mirror).
3. Extend `server/src/shared/widget/geometry.test.ts` or `server/src/services/widgetCanvas.test.ts` with the new numbers.

## Visual check

1. `docker compose -p widgecode up -d`, then start the `api` and `client` launch configs (`.claude/launch.json`).
2. Create/publish a test widget via the API (local test account), then open side by side at the same zoom:
   - `/w/<slug>?embed=1` (iframe content, real size)
   - `http://localhost:4000/api/public/widgets/<slug>/image.svg` (add `?locale=ru` to match a Russian UI)
   - `/w/<slug>` and the editor `/widgets/<id>` (scaled)
3. Known intentional difference: the SVG locale comes from `?locale=` rather than the app setting.
4. Finish with the `verify` skill.
