-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_DUE_IN_7_DAYS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_DUE_IN_3_DAYS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_DUE_TODAY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_OVERDUE_1_DAY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CRITICAL_TASK_OVERDUE';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "deduplicationKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_deduplicationKey_key" ON "Notification"("deduplicationKey");

-- CreateIndex
CREATE INDEX "Notification_eventTaskId_type_idx" ON "Notification"("eventTaskId", "type");
