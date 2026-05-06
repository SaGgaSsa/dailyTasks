-- AlterEnum
ALTER TYPE "EnvironmentLogEntryType" ADD VALUE 'SCRIPT';

-- AlterTable
ALTER TABLE "environment_log_entries" ADD COLUMN "scriptType" "ScriptType";
