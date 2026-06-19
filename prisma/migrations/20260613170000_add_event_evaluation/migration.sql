-- CreateTable
CREATE TABLE "EventEvaluation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "registrations" INTEGER,
    "attendees" INTEGER,
    "noShowRate" DOUBLE PRECISION,
    "targetAudienceFit" INTEGER,
    "satisfaction" DOUBLE PRECISION,
    "netPromoterScore" INTEGER,
    "newContacts" INTEGER,
    "cooperationApproaches" INTEGER,
    "followUpConversations" INTEGER,
    "qualitativeLearnings" TEXT,
    "wentWell" TEXT,
    "wasDifficult" TEXT,
    "nextTimeDifferent" TEXT,
    "repeatEvent" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventEvaluation_eventId_key" ON "EventEvaluation"("eventId");

-- AddForeignKey
ALTER TABLE "EventEvaluation" ADD CONSTRAINT "EventEvaluation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
