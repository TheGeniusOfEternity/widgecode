-- Remove blocks created with the old default layout (two columns by one row).
DELETE FROM "Block"
WHERE "config"->'layout'->>'width' = '2'
  AND "config"->'layout'->>'height' = '1';

-- Keep block positions contiguous after the cleanup.
WITH ranked_blocks AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "widgetId"
            ORDER BY "position", "createdAt", "id"
        )::integer - 1 AS "nextPosition"
    FROM "Block"
)
UPDATE "Block" AS block
SET "position" = ranked."nextPosition"
FROM ranked_blocks AS ranked
WHERE block."id" = ranked."id";
