# Widget grid and blocks

Design reference for how widgets are laid out and how blocks adapt to their size.

## Grid

|                        |                                  |
| ---------------------- | -------------------------------- |
| Widget width           | 600 px (fixed)                   |
| Columns                | 4                                |
| Rows                   | up to 5 (editable limit)         |
| Cell                   | 129 × 129 px                     |
| Gap                    | 12 px                            |
| Canvas padding         | 24 px                            |
| Block padding / radius | 12 px / 16 px                    |
| Sizes                  | 4×4 = 600 × 600, 4×5 = 600 × 741 |

Content width of a block by column span (cell − 2 × (padding + border)): 1 → 103 px, 2 → 244 px,
3 → 385 px, 4 → 526 px. Height works the same way per row span.

The numbers live in `server/src/shared/widget/geometry.ts`. Widgets created on the old 2-column grid
were migrated by doubling every layout (one old cell = 2 × 2 new cells); those that end up taller
than 5 rows still render, can be edited without growing, and the editor offers "Fit into 5 rows".

## Block sizes and variants

A block declares the sizes it supports (`server/src/shared/widget/blockSizes.ts`); the editor's
corner resize snaps to them and the server rejects anything else. Each supported size has its own
layout ("variant") instead of scaling one design. Not every block needs every size.

Planned variant matrix (✓ = supported):

| Block          | 1×1                | 2×1                     | 2×2                         | 4×1                           | 4×2                          | other                             |
| -------------- | ------------------ | ----------------------- | --------------------------- | ----------------------------- | ---------------------------- | --------------------------------- |
| text           | short text         | ✓                       | ✓                           | ✓                             | ✓                            | 3×1, 3×2, 4×3 (font fits the box) |
| github-stats   | avatar + followers | avatar, name, @user     | card: avatar, name, 3 stats | identity left, stats right    | big avatar, name, bio, stats |                                   |
| github-langs   | top language + %   | bar + top-3 legend      | bar + list (≤ 6)            | wide bar + inline legend      | bar + 2-column list (≤ 8)    |                                   |
| github-commits | commits + streak   | commits + streak        | stats + ~19-week heatmap    | caption + 40-week heatmap     | stats + 40-week heatmap      |                                   |
| github-prs     | merged %           | total + merged          | stats + bar + legend        | stats + bar inline            | —                            |                                   |
| github-status  | emoji (+ busy dot) | emoji + 2-line message  | emoji, message, busy        | emoji + one-line message      | —                            |                                   |
| leetcode-stats | solved             | solved + difficulty bar | title, 3 stats, difficulty  | inline stats + difficulty bar | full + per-difficulty bars   |                                   |

Defaults: new blocks are 2×2 (text 2×1), placed at the first free spot.

## Block limit and plan tiers

| Plan              | Blocks per widget |
| ----------------- | ----------------- |
| Free              | 8                 |
| Paid subscription | 16                |
| Special accounts  | 20                |

Only the free limit is implemented (`MAX_WIDGET_BLOCKS` = 8 on the server, `MAX_BLOCKS` in the
editor). Paid and special tiers need billing and an account plan field first.
