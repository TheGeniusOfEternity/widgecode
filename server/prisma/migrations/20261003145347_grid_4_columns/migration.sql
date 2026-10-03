-- Data-only migration: the widget grid goes from 2 to 4 columns (cells half the size).
-- Each old cell is exactly 2×2 new cells, so doubling every layout keeps widgets looking the same.

-- 1. Double block layouts (blocks saved before layouts existed are stacked by position).
UPDATE "Block"
SET "config" = jsonb_set(
  "config",
  '{layout}',
  jsonb_build_object(
    'x', COALESCE(("config"->'layout'->>'x')::int, 0) * 2,
    'y', COALESCE(("config"->'layout'->>'y')::int, "position") * 2,
    'width', COALESCE(("config"->'layout'->>'width')::int, 1) * 2,
    'height', COALESCE(("config"->'layout'->>'height')::int, 1) * 2
  )
);

-- 2. Every widget uses the 4-column grid.
UPDATE "Widget"
SET "config" = jsonb_set(COALESCE("config", '{}'::jsonb), '{grid}', '{"columns": 4}'::jsonb);

-- 3. Recompute stored heights: 129px cells, 12px gaps, 24px padding (width 600), capped at 1200.
UPDATE "Widget" AS w
SET "height" = LEAST(1200, rows.count * 129 + (rows.count - 1) * 12 + 48)
FROM (
  SELECT "widgetId",
         MAX(("config"->'layout'->>'y')::int + ("config"->'layout'->>'height')::int) AS count
  FROM "Block"
  GROUP BY "widgetId"
) AS rows
WHERE rows."widgetId" = w."id";

UPDATE "Widget"
SET "height" = 129 + 48
WHERE NOT EXISTS (SELECT 1 FROM "Block" WHERE "Block"."widgetId" = "Widget"."id");
