/*
  Warnings:

  - The values [CRITICAL] on the enum `Priority` will be removed. If these variants are still used in the database, this will fail.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `workspace_members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to drop the `_UserWorkspaces` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subtasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tasks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wiki_pages` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DEV');

-- CreateEnum
CREATE TYPE "TramiteType" AS ENUM ('I_MODAPL', 'I_CASO');

-- CreateEnum
CREATE TYPE "TechStack" AS ENUM ('SISA', 'ANDROID', 'ANGULAR', 'WEB', 'SPRING');

-- AlterEnum
BEGIN;
CREATE TYPE "Priority_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
ALTER TABLE "public"."tasks" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "incidences" ALTER COLUMN "priority" TYPE "Priority_new" USING ("priority"::text::"Priority_new");
ALTER TYPE "Priority" RENAME TO "Priority_old";
ALTER TYPE "Priority_new" RENAME TO "Priority";
DROP TYPE "public"."Priority_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "_UserWorkspaces" DROP CONSTRAINT "_UserWorkspaces_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserWorkspaces" DROP CONSTRAINT "_UserWorkspaces_B_fkey";

-- DropForeignKey
ALTER TABLE "subtasks" DROP CONSTRAINT "subtasks_taskId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "wiki_pages" DROP CONSTRAINT "wiki_pages_authorId_fkey";

-- DropForeignKey
ALTER TABLE "wiki_pages" DROP CONSTRAINT "wiki_pages_taskId_fkey";

-- DropForeignKey
ALTER TABLE "wiki_pages" DROP CONSTRAINT "wiki_pages_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_workspaceId_fkey";

-- DropIndex
DROP INDEX "workspace_members_userId_workspaceId_key";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'DEV',
ALTER COLUMN "username" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_pkey",
DROP COLUMN "id",
DROP COLUMN "joinedAt",
DROP COLUMN "role",
ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("userId", "workspaceId");

-- DropTable
DROP TABLE "_UserWorkspaces";

-- DropTable
DROP TABLE "subtasks";

-- DropTable
DROP TABLE "tasks";

-- DropTable
DROP TABLE "wiki_pages";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "TaskStatus";

-- DropEnum
DROP TYPE "WorkspaceRole";

-- CreateTable
CREATE TABLE "tramites" (
    "id" TEXT NOT NULL,
    "type" "TramiteType" NOT NULL,
    "number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "technology" "TechStack" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tramites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidences" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedTime" INTEGER,
    "comment" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tramiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "incidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "incidenceId" TEXT NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IncidenceAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IncidenceAssignees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "tramites_type_number_key" ON "tramites"("type", "number");

-- CreateIndex
CREATE UNIQUE INDEX "incidences_workspaceId_tramiteId_key" ON "incidences"("workspaceId", "tramiteId");

-- CreateIndex
CREATE INDEX "_IncidenceAssignees_B_index" ON "_IncidenceAssignees"("B");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidences" ADD CONSTRAINT "incidences_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidences" ADD CONSTRAINT "incidences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_incidenceId_fkey" FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IncidenceAssignees" ADD CONSTRAINT "_IncidenceAssignees_A_fkey" FOREIGN KEY ("A") REFERENCES "incidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IncidenceAssignees" ADD CONSTRAINT "_IncidenceAssignees_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
