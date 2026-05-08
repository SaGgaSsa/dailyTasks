-- Add deferred statuses for paused incidences and linked QA tickets.
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'DEFERRED';
ALTER TYPE "TicketQAStatus" ADD VALUE IF NOT EXISTS 'DEFERRED';

ALTER TABLE "incidences"
  ADD COLUMN "deferredAt" TIMESTAMP(3),
  ADD COLUMN "deferredReason" TEXT,
  ADD COLUMN "deferredById" INTEGER;

ALTER TABLE "incidences"
  ADD CONSTRAINT "incidences_deferredById_fkey"
  FOREIGN KEY ("deferredById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
