CREATE TABLE "work_item_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "work_item_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_item_types_name_key" ON "work_item_types"("name");

INSERT INTO "work_item_types" ("name")
SELECT DISTINCT "type"::text
FROM "external_work_items"
UNION
SELECT unnest(ARRAY['I_CASO', 'I_CONS', 'I_MODAPL']::text[])
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "external_work_items"
ADD COLUMN "workItemTypeId" INTEGER;

UPDATE "external_work_items" AS ewi
SET "workItemTypeId" = wit."id"
FROM "work_item_types" AS wit
WHERE wit."name" = ewi."type"::text;

ALTER TABLE "external_work_items"
ALTER COLUMN "workItemTypeId" SET NOT NULL;

ALTER TABLE "external_work_items"
ADD CONSTRAINT "external_work_items_workItemTypeId_fkey"
FOREIGN KEY ("workItemTypeId") REFERENCES "work_item_types"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "external_work_items"
DROP CONSTRAINT "external_work_items_type_externalId_key";

CREATE UNIQUE INDEX "external_work_items_workItemTypeId_externalId_key"
ON "external_work_items"("workItemTypeId", "externalId");

ALTER TABLE "external_work_items"
DROP COLUMN "type";
