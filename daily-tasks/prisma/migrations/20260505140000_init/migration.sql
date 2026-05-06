-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DEV', 'QA');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('I_CASO', 'I_CONS', 'I_MODAPL');

-- CreateEnum
CREATE TYPE "EnvironmentLogEntryType" AS ENUM ('DEPLOY', 'CONFIGURATION');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'BLOCKER');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('FILE', 'LINK');

-- CreateEnum
CREATE TYPE "TicketQAStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_DEVELOPMENT', 'TEST', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('BUG', 'CAMBIO', 'CONSULTA');

-- CreateEnum
CREATE TYPE "ExternalWorkItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ScriptType" AS ENUM ('SQL', 'CODE');

-- CreateEnum
CREATE TYPE "TracklistStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InboxMessageType" AS ENUM ('TICKET_BLOCKER_CREATED', 'TICKET_REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
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
CREATE TABLE "environments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_item_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "work_item_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_work_items" (
    "id" SERIAL NOT NULL,
    "workItemTypeId" INTEGER NOT NULL,
    "externalId" INTEGER NOT NULL,
    "title" TEXT,
    "status" "ExternalWorkItemStatus" NOT NULL DEFAULT 'ACTIVE',

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
    "readyForDeployAt" TIMESTAMP(3),
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
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
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
    "incidenceId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidence_pages_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "environment_log_entries" (
    "id" SERIAL NOT NULL,
    "type" "EnvironmentLogEntryType" NOT NULL DEFAULT 'DEPLOY',
    "environmentId" INTEGER NOT NULL,
    "ticketId" INTEGER,
    "incidenceId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "batchId" UUID,
    "subject" TEXT,
    "body" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedById" INTEGER,
    "validationNote" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environment_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_environment_favorites" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "environmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_environment_favorites_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "inbox_messages" (
    "id" SERIAL NOT NULL,
    "type" "InboxMessageType" NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "referenceType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "environments_name_key" ON "environments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "work_item_types_name_key" ON "work_item_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "work_item_types_color_key" ON "work_item_types"("color");

-- CreateIndex
CREATE UNIQUE INDEX "external_work_items_workItemTypeId_externalId_key" ON "external_work_items"("workItemTypeId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_incidenceId_userId_key" ON "assignments"("incidenceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qa_incidenceId_key" ON "tickets_qa"("incidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qa_tracklistId_ticketNumber_key" ON "tickets_qa"("tracklistId", "ticketNumber");

-- CreateIndex
CREATE INDEX "environment_log_entries_environmentId_occurredAt_idx" ON "environment_log_entries"("environmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "environment_log_entries_batchId_idx" ON "environment_log_entries"("batchId");

-- CreateIndex
CREATE INDEX "environment_log_entries_validatedById_idx" ON "environment_log_entries"("validatedById");

-- CreateIndex
CREATE INDEX "environment_log_entries_ticketId_environmentId_occurredAt_idx" ON "environment_log_entries"("ticketId", "environmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "environment_log_entries_incidenceId_environmentId_occurredA_idx" ON "environment_log_entries"("incidenceId", "environmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_environment_favorites_userId_environmentId_key" ON "user_environment_favorites"("userId", "environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "non_working_days_date_key" ON "non_working_days"("date");

-- CreateIndex
CREATE INDEX "_TechnologyToUser_B_index" ON "_TechnologyToUser"("B");

-- CreateIndex
CREATE INDEX "_ExternalWorkItemToTracklist_B_index" ON "_ExternalWorkItemToTracklist"("B");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_work_items" ADD CONSTRAINT "external_work_items_workItemTypeId_fkey" FOREIGN KEY ("workItemTypeId") REFERENCES "work_item_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_incidenceId_fkey" FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "environment_log_entries" ADD CONSTRAINT "environment_log_entries_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_log_entries" ADD CONSTRAINT "environment_log_entries_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets_qa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_log_entries" ADD CONSTRAINT "environment_log_entries_incidenceId_fkey" FOREIGN KEY ("incidenceId") REFERENCES "incidences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_log_entries" ADD CONSTRAINT "environment_log_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_log_entries" ADD CONSTRAINT "environment_log_entries_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_environment_favorites" ADD CONSTRAINT "user_environment_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_environment_favorites" ADD CONSTRAINT "user_environment_favorites_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TechnologyToUser" ADD CONSTRAINT "_TechnologyToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TechnologyToUser" ADD CONSTRAINT "_TechnologyToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExternalWorkItemToTracklist" ADD CONSTRAINT "_ExternalWorkItemToTracklist_A_fkey" FOREIGN KEY ("A") REFERENCES "external_work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExternalWorkItemToTracklist" ADD CONSTRAINT "_ExternalWorkItemToTracklist_B_fkey" FOREIGN KEY ("B") REFERENCES "tracklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
