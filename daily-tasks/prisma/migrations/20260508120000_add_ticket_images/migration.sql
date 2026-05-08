-- CreateTable
CREATE TABLE "ticket_images" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER,
    "draftId" TEXT,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_images_url_key" ON "ticket_images"("url");

-- CreateIndex
CREATE INDEX "ticket_images_ticketId_idx" ON "ticket_images"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_images_draftId_idx" ON "ticket_images"("draftId");

-- CreateIndex
CREATE INDEX "ticket_images_ticketId_draftId_createdAt_idx" ON "ticket_images"("ticketId", "draftId", "createdAt");

-- AddForeignKey
ALTER TABLE "ticket_images" ADD CONSTRAINT "ticket_images_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets_qa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_images" ADD CONSTRAINT "ticket_images_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
