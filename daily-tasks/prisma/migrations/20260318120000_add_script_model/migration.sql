-- CreateEnum
CREATE TYPE "ScriptType" AS ENUM ('SQL', 'CODE');

-- CreateTable
CREATE TABLE "scripts" (
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
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_incidenceId_fkey" FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
