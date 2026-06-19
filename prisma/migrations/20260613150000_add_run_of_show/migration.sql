-- CreateTable
CREATE TABLE "RunOfShowItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "programItem" TEXT NOT NULL,
    "goal" TEXT,
    "method" TEXT,
    "responsibleUserId" TEXT,
    "material" TEXT,
    "risk" TEXT,
    "transitionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunOfShowItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunOfShowItem_eventId_startTime_idx" ON "RunOfShowItem"("eventId", "startTime");

-- CreateIndex
CREATE INDEX "RunOfShowItem_responsibleUserId_idx" ON "RunOfShowItem"("responsibleUserId");

-- AddForeignKey
ALTER TABLE "RunOfShowItem" ADD CONSTRAINT "RunOfShowItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunOfShowItem" ADD CONSTRAINT "RunOfShowItem_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
