-- CreateEnum
CREATE TYPE "ExternalWorkItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "external_work_items"
ADD COLUMN "status" "ExternalWorkItemStatus" NOT NULL DEFAULT 'ACTIVE';

