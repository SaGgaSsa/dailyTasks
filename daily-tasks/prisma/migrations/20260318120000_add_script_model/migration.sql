-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "ScriptType" AS ENUM ('SQL', 'CODE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "scripts" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ScriptType" NOT NULL,
    "incidenceId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'scripts_incidenceId_fkey'
    ) THEN
        ALTER TABLE "scripts"
        ADD CONSTRAINT "scripts_incidenceId_fkey"
        FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'scripts_createdById_fkey'
    ) THEN
        ALTER TABLE "scripts"
        ADD CONSTRAINT "scripts_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
