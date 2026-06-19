-- CreateEnum
CREATE TYPE "ParticipantTargetGroup" AS ENUM ('COMPANY', 'STARTUP', 'SME', 'UNIVERSITY_RESEARCH', 'PUBLIC_ADMINISTRATION_POLITICS', 'MULTIPLIER', 'INVESTOR_FUNDING', 'TECHNOLOGY_PROVIDER', 'PROFESSIONAL_TALENT', 'PRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('IDENTIFIED', 'INVITED', 'REGISTERED', 'CONFIRMED', 'WAITLIST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantRating" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('NOT_REQUIRED', 'OPEN', 'PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "role" TEXT,
    "email" TEXT NOT NULL,
    "targetGroupType" "ParticipantTargetGroup" NOT NULL DEFAULT 'OTHER',
    "status" "ParticipantStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "personallyInvited" BOOLEAN NOT NULL DEFAULT false,
    "registered" BOOLEAN NOT NULL DEFAULT false,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "noShowRisk" "ParticipantRating" NOT NULL DEFAULT 'MEDIUM',
    "interestTopic" TEXT,
    "matchmakingPotential" "ParticipantRating" NOT NULL DEFAULT 'MEDIUM',
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipant_eventId_email_key" ON "EventParticipant"("eventId", "email");

-- CreateIndex
CREATE INDEX "EventParticipant_eventId_targetGroupType_idx" ON "EventParticipant"("eventId", "targetGroupType");

-- CreateIndex
CREATE INDEX "EventParticipant_eventId_status_idx" ON "EventParticipant"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventParticipant_eventId_followUpNeeded_followUpStatus_idx" ON "EventParticipant"("eventId", "followUpNeeded", "followUpStatus");

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
