-- Restore the two-column grid after the old drag workaround saved columns: 1.
UPDATE "Widget"
SET "config" = jsonb_set(
    COALESCE("config", '{}'::jsonb),
    '{grid,columns}',
    '2'::jsonb,
    true
)
WHERE "config"->'grid'->>'columns' = '1';
