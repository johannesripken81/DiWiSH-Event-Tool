-- Existing events keep their format and have no project assignment by default.
ALTER TABLE "Event" ADD COLUMN "project" TEXT;
ALTER TYPE "TaskStatus" ADD VALUE 'WAITING_EXTERNAL';
