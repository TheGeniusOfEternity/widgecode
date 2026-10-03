---
name: widget-render-parity
description: Explains how WidgeCode renders widgets (one shared SVG renderer for the editor, public page, iframe and /image.svg export) and how to debug size, layout or text differences. Use for bugs like "widget looks different in SVG", "blocks are cut off", "preview scale is off", or when changing widget geometry or block visuals.
---

# Widget rendering

There is one renderer. Everything that draws a widget uses the same SVG React components from
`server/src/shared/widget/` (imported on the client as `@shared/widget/*`).

| Piece         | File                                                  | Role                                                                                                                                                                           |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Geometry      | `geometry.ts`                                         | Width 600, padding, gap, cell size, block padding, radii, line heights, `widgetDimensions`, `blockBox`, `blockTypography`, `estimateTextWidth`, heatmap sizing                 |
| Theme         | `theme.ts`                                            | Palettes, colors, ru/en block labels, `formatStatValue`                                                                                                                        |
| Primitives    | `svgPrimitives.tsx`                                   | `SvgText`, `MultilineText`, `TitleRow`, `StatsRow`, `fitText`, `linesOf`, `baseline`, `layoutOf`                                                                               |
| Block content | `BlockContent.tsx`                                    | Per-type drawing inside a block's content box, plus skeleton / error / preview states                                                                                          |
| Canvas parts  | `canvasParts.tsx`                                     | `CanvasBackground`, `BlockShell`, `CanvasEmptyState`, `canvasBoxes`, `canvasTokens`                                                                                            |
| Export        | `WidgetCanvas.tsx`                                    | Composes the parts into one standalone `<svg>` for `/api/public/widgets/:slug/image.svg`                                                                                       |
| Browser       | `client/src/entities/widget/ui/WidgetSurface.tsx`     | Same parts, but the background and each block are separate `<svg>`s placed with `canvasBoxes`, so the editor can attach DOM controls (drag handle, size, remove) to each block |
| Scaling       | `client/src/entities/widget/ui/ScaledWidgetFrame.tsx` | Renders at stored size and scales to fit (editor, public page)                                                                                                                 |

Rules:

- Layout numbers belong in `geometry.ts` / `theme.ts`.
- SVG has no text layout: widths come from `estimateTextWidth` (per-character-class widths
  calibrated to the font). Truncate with `fitText`, wrap with `linesOf`; never assume CSS will do it.
- SVG ids (gradients, clip paths) must be prefixed per instance (`idPrefix`) — several widgets can
  be on one page in the browser.
- The export inlines images as data URIs; the browser uses URLs.

## Debugging differences

Because the code is shared, differences between the editor, iframe and export come from inputs,
not drawing: different `height`/`rows` (the editor adds a spare row while dragging), different
`renderedBlocks` (editor previews vs public data), locale (`?locale=` for the export), or fonts
installed on the viewer's machine (affects real text width vs the estimate).

## Visual check

1. `docker compose -p widgecode up -d`, then start the `api` and `client` launch configs (`.claude/launch.json`).
2. Create/publish a test widget via the API (local test account), then compare at the same zoom:
   `/w/<slug>?embed=1`, `http://localhost:4000/api/public/widgets/<slug>/image.svg?locale=ru`,
   `/w/<slug>` and the editor `/widgets/<id>`.
3. Finish with the `verify` skill.
