-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DEV', 'QA');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('I_CASO', 'I_CONS', 'I_MODAPL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'BLOCKER');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('FILE', 'LINK');

-- CreateEnum
CREATE TYPE "TicketQAStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_DEVELOPMENT', 'TEST', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('BUG', 'CAMBIO', 'CONSULTA');

-- CreateEnum
CREATE TYPE "IncidencePageType" AS ENUM ('DEFAULT', 'SYSTEM_SCRIPTS');

-- CreateEnum
CREATE TYPE "TracklistStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DEV',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "technologyId" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_work_items" (
    "id" SERIAL NOT NULL,
    "type" "TaskType" NOT NULL,
    "externalId" INTEGER NOT NULL,
    "title" TEXT,

    CONSTRAINT "external_work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidences" (
    "id" SERIAL NOT NULL,
    "externalWorkItemId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "comment" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "technologyId" INTEGER NOT NULL,
    "estimatedTime" INTEGER,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" SERIAL NOT NULL,
    "incidenceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedHours" INTEGER,
    "isAssigned" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isQaReported" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "assignmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "type" "AttachmentType" NOT NULL DEFAULT 'FILE',
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,
    "description" TEXT,
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "externalWorkItemId" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidence_pages" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "isMainPage" BOOLEAN NOT NULL DEFAULT false,
    "pageType" "IncidencePageType" NOT NULL DEFAULT 'DEFAULT',
    "incidenceId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidence_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracklists" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TracklistStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "completedById" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets_qa" (
    "id" SERIAL NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "tracklistId" INTEGER NOT NULL,
    "type" "TicketType" NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "externalWorkItemId" INTEGER,
    "reportedById" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "incidenceId" INTEGER,
    "status" "TicketQAStatus" NOT NULL DEFAULT 'NEW',
    "dismissReason" TEXT,
    "dismissedById" INTEGER,
    "logs" TEXT,
    "observations" TEXT,
    "hasUnreadUpdates" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_qa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_working_days" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "non_working_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TechnologyToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TechnologyToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ExternalWorkItemToTracklist" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ExternalWorkItemToTracklist_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "technologies_name_key" ON "technologies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "modules_slug_key" ON "modules"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "external_work_items_type_externalId_key" ON "external_work_items"("type", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_incidenceId_userId_key" ON "assignments"("incidenceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qa_incidenceId_key" ON "tickets_qa"("incidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qa_tracklistId_ticketNumber_key" ON "tickets_qa"("tracklistId", "ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "non_working_days_date_key" ON "non_working_days"("date");

-- CreateIndex
CREATE INDEX "_TechnologyToUser_B_index" ON "_TechnologyToUser"("B");

-- CreateIndex
CREATE INDEX "_ExternalWorkItemToTracklist_B_index" ON "_ExternalWorkItemToTracklist"("B");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidences" ADD CONSTRAINT "incidences_externalWorkItemId_fkey" FOREIGN KEY ("externalWorkItemId") REFERENCES "external_work_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidences" ADD CONSTRAINT "incidences_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_incidenceId_fkey" FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_externalWorkItemId_fkey" FOREIGN KEY ("externalWorkItemId") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidence_pages" ADD CONSTRAINT "incidence_pages_incidenceId_fkey" FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidence_pages" ADD CONSTRAINT "incidence_pages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracklists" ADD CONSTRAINT "tracklists_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracklists" ADD CONSTRAINT "tracklists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_qa" ADD CONSTRAINT "tickets_qa_tracklistId_fkey" FOREIGN KEY ("tracklistId") REFERENCES "tracklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_qa" ADD CONSTRAINT "tickets_qa_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_qa" ADD CONSTRAINT "tickets_qa_externalWorkItemId_fkey" FOREIGN KEY ("externalWorkItemId") REFERENCES "external_work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_qa" ADD CONSTRAINT "tickets_qa_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_qa" ADD CONSTRAINT "tickets_qa_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_qa" ADD CONSTRAINT "tickets_qa_incidenceId_fkey" FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_qa" ADD CONSTRAINT "tickets_qa_dismissedById_fkey" FOREIGN KEY ("dismissedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TechnologyToUser" ADD CONSTRAINT "_TechnologyToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TechnologyToUser" ADD CONSTRAINT "_TechnologyToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExternalWorkItemToTracklist" ADD CONSTRAINT "_ExternalWorkItemToTracklist_A_fkey" FOREIGN KEY ("A") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExternalWorkItemToTracklist" ADD CONSTRAINT "_ExternalWorkItemToTracklist_B_fkey" FOREIGN KEY ("B") REFERENCES "tracklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
