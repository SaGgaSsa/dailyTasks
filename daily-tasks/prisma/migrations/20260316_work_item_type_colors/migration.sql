ALTER TABLE "work_item_types"
ADD COLUMN "color" TEXT;

UPDATE "work_item_types"
SET "color" = CASE "name"
    WHEN 'BUG' THEN 'red'
    WHEN 'FEATURE' THEN 'green'
    WHEN 'I_MODAPL' THEN 'blue'
    WHEN 'I_CASO' THEN 'orange'
    WHEN 'I_CONS' THEN 'purple'
    ELSE NULL
END
WHERE "color" IS NULL;

CREATE UNIQUE INDEX "work_item_types_color_key" ON "work_item_types"("color");
