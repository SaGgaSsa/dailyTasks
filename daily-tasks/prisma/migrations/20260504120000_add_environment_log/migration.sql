CREATE TYPE "EnvironmentLogEntryType" AS ENUM ('DEPLOY');

ALTER TABLE "incidences"
ADD COLUMN "readyForDeployAt" TIMESTAMP(3);

UPDATE "incidences"
SET "readyForDeployAt" = COALESCE("updatedAt", NOW())
WHERE "status" = 'REVIEW'
  AND "readyForDeployAt" IS NULL;

CREATE TABLE "environment_log_entries" (
    "id" SERIAL NOT NULL,
    "type" "EnvironmentLogEntryType" NOT NULL DEFAULT 'DEPLOY',
    "environmentId" INTEGER NOT NULL,
    "ticketId" INTEGER,
    "incidenceId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environment_log_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_environment_favorites" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "environmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_environment_favorites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "environment_log_entries_environmentId_occurredAt_idx" ON "environment_log_entries"("environmentId", "occurredAt");
CREATE INDEX "environment_log_entries_ticketId_environmentId_occurredAt_idx" ON "environment_log_entries"("ticketId", "environmentId", "occurredAt");
CREATE INDEX "environment_log_entries_incidenceId_environmentId_occurredAt_idx" ON "environment_log_entries"("incidenceId", "environmentId", "occurredAt");

CREATE UNIQUE INDEX "user_environment_favorites_userId_environmentId_key" ON "user_environment_favorites"("userId", "environmentId");

ALTER TABLE "environment_log_entries"
ADD CONSTRAINT "environment_log_entries_environmentId_fkey"
FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "environment_log_entries"
ADD CONSTRAINT "environment_log_entries_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "tickets_qa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "environment_log_entries"
ADD CONSTRAINT "environment_log_entries_incidenceId_fkey"
FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "environment_log_entries"
ADD CONSTRAINT "environment_log_entries_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_environment_favorites"
ADD CONSTRAINT "user_environment_favorites_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_environment_favorites"
ADD CONSTRAINT "user_environment_favorites_environmentId_fkey"
FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
