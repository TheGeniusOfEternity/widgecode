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

Variant families by size (`blockVariant` in `blockSizes.ts`):

| Family  | Sizes         | Idea                                           |
| ------- | ------------- | ---------------------------------------------- |
| `tiny`  | 1×1           | one headline number or symbol                  |
| `strip` | 2×1, 3×1      | title + 2–3 facts in one line                  |
| `wide`  | 4×1           | title + a full row of facts or a compact chart |
| `card`  | 2×2, 3×2, 2×4 | the classic block                              |
| `large` | 4×2, 4×3, 4×4 | roomy layout; blocks without one use `card`    |

Implemented layouts (renderers in `server/src/shared/widget/blocks/`):

| Block          | 1×1                                                                            | 2×1                               | 4×1                                   | 2×2                    | 4×2                              |
| -------------- | ------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------- | ---------------------- | -------------------------------- |
| text           | text fitted to the box, centred vertically, in every size (also 3×1, 3×2, 4×3) |                                   |                                       |                        |                                  |
| github-stats   | avatar + followers                                                             | avatar, name, @user, summary line | identity left, 3 stats right          | card                   | big avatar, name, bio, stats row |
| github-langs   | top language % + mix bar                                                       | bar + 2-language legend           | bar + 4-language legend               | card                   | card                             |
| github-commits | commits + 🔥 streak                                                            | commits + current streak          | caption + compact heatmap (~48 weeks) | card (19-week heatmap) | card (40-week heatmap)           |
| github-prs     | merged % + breakdown bar                                                       | total / merged / open             | + closed, breakdown bar               | card                   | card                             |
| github-status  | emoji (+ busy dot)                                                             | emoji + 2-line message            | emoji + 1-line message                | card                   | card                             |
| leetcode-stats | solved + difficulty bar                                                        | solved, ranking + difficulty bar  | + contest rating                      | card                   | stats + one bar per difficulty   |

Every block also keeps the doubled legacy sizes (2×2, 2×4, 4×2, 4×4) so migrated widgets stay
valid. Defaults: new blocks are 2×2 (text 2×1); when that doesn't fit, the next smaller allowed
size that does is used (`placementSizes`).

## Block limit and plan tiers

| Plan              | Blocks per widget |
| ----------------- | ----------------- |
| Free              | 8                 |
| Paid subscription | 16                |
| Special accounts  | 20                |

Only the free limit is implemented (`MAX_WIDGET_BLOCKS` = 8 on the server, `MAX_BLOCKS` in the
editor). Paid and special tiers need billing and an account plan field first.
