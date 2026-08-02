-- A 2x1 layout is valid in the current editor, so retain all blocks.
-- Keep block positions contiguous after the legacy layout migration.
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
