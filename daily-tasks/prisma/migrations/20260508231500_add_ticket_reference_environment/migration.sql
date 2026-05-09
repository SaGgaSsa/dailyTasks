ALTER TABLE "tickets_qa" ADD COLUMN "environmentId" INTEGER;

ALTER TABLE "tickets_qa"
  ADD CONSTRAINT "tickets_qa_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "environments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tickets_qa_environmentId_idx" ON "tickets_qa"("environmentId");
