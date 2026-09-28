---
name: widget-render-parity
description: Diagnose and fix size, padding, gap, scale, or background differences between the WidgetCanvas in the editor, the public page/iframe, and the exported SVG image. Use for any bug like "widget looks different in SVG", "blocks are smaller in export", "preview scale is off", or when changing widget geometry.
---

# Widget render parity

The same widget is drawn by three independent pieces of code. They must produce the same geometry.

| #   | Where           | File                                                                          | Used by                                                           |
| --- | --------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | HTML/CSS canvas | `client/src/entities/widget/ui/WidgetCanvas.tsx` + `WidgetCanvas.module.css`  | editor preview, gallery cards, `/w/:slug` page, iframe embed      |
| 2   | SVG canvas      | `server/src/shared/widget/WidgetCanvas.tsx` (`WidgetCanvas`, block renderers) | `/api/public/widgets/:slug/image.svg`                             |
| 3   | Size math       | `server/src/services/widgetService.ts` → `widgetDimensions`                   | stored `Widget.width/height` (drives iframe size and SVG viewBox) |

## Geometry to compare

For each renderer, write down: outer padding, grid gap, column count, cell width, cell height (square vs stretched), per-block inner padding, border radius, chrome/title height, background layers.

Known reference values (check they are still current):

- Server size math: width 600, padding `min(34, max(20, width*0.04))` = 24, gap 18, square cells.
- SVG canvas: same outer padding formula on the canvas width, gap 18; cell height = remaining height / rows; block inner padding `min(20, max(10, blockWidth*0.04))`.
- CSS canvas: `.canvas { padding: clamp(20px, 4vw, 34px); gap: 18px }` — `4vw` depends on the **browser viewport**, not the widget width, so on desktop it resolves to 34px while the other two use 24px. That alone makes the editor/iframe cells smaller than the SVG cells. Prefer a value derived from `--widget-width` (e.g. `clamp(20px, calc(var(--widget-width) * 0.04), 34px)`) so all three agree.

## Workflow

1. Reproduce with one fixed widget: open the editor, the iframe URL (`/w/<slug>?embed=1`), and the SVG URL side by side at 1× zoom.
2. Compute the numbers above for each renderer; the mismatch is usually a formula, not a pixel tweak. Fix the formula in the renderer that disagrees with `widgetDimensions` — the stored size is the contract.
3. If you change a shared number, extract it into `server/src/shared/widget/` and import it on both sides via `@shared/…` instead of copying it.
4. Add/extend a test in `server/src/services/widgetCanvas.test.ts` asserting the SVG `viewBox`, outer padding, or block rect positions for a known layout.
5. Run the app (`npm run dev`) and visually compare again, then the `verify` skill.

Background leaking around the SVG usually comes from the root `<rect>` not matching the viewBox or from `outputWidth/outputHeight` scaling without a matching `viewBox`.
