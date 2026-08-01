ALTER TABLE "Widget" ADD COLUMN "slug" TEXT;

UPDATE "Widget"
SET "slug" = CONCAT('legacy-widget-', "id")
WHERE "slug" IS NULL;

ALTER TABLE "Widget" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Widget_slug_key" ON "Widget"("slug");
