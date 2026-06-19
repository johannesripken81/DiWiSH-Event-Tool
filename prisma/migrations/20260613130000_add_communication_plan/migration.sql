-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('WEBSITE', 'NEWSLETTER', 'LINKEDIN', 'PARTNER_COMMUNICATION', 'PERSONAL_INVITATION', 'REMINDER_EMAIL', 'PRESS', 'POST_EVENT_REPORT');

-- CreateEnum
CREATE TYPE "CommunicationApprovalStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CommunicationMeasure" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "responsibleUserId" TEXT,
    "publicationDate" DATE NOT NULL,
    "approvalStatus" "CommunicationApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "assetUrl" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "registrations" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationMeasure_eventId_publicationDate_idx" ON "CommunicationMeasure"("eventId", "publicationDate");

-- CreateIndex
CREATE INDEX "CommunicationMeasure_eventId_channel_idx" ON "CommunicationMeasure"("eventId", "channel");

-- CreateIndex
CREATE INDEX "CommunicationMeasure_eventId_approvalStatus_idx" ON "CommunicationMeasure"("eventId", "approvalStatus");

-- CreateIndex
CREATE INDEX "CommunicationMeasure_responsibleUserId_idx" ON "CommunicationMeasure"("responsibleUserId");

-- AddForeignKey
ALTER TABLE "CommunicationMeasure" ADD CONSTRAINT "CommunicationMeasure_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationMeasure" ADD CONSTRAINT "CommunicationMeasure_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
