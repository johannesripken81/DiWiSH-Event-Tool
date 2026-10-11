import { TaskStatus } from "@/generated/prisma/enums";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { CLOSED_TASK_STATUSES } from "./metrics";
import { calculatePhaseProgress } from "./phase-progress";

export async function getEventWorkspaceData(eventId: string) {
  const user = await requireEventReadAccess();
  const db = getDb();
  const select = {
    id: true,
    title: true,
    phase: true,
    status: true,
    dueDate: true,
    isCritical: true,
  } as const;
  const orderBy = [
    { dueDate: { sort: "asc", nulls: "last" } },
    { title: "asc" },
    { id: "asc" },
  ] as const;
  const [groups, myTasks, myReviews] = await Promise.all([
    db.eventTask.groupBy({
      by: ["phase", "status"],
      where: { eventId },
      _count: { _all: true },
    }),
    db.eventTask.findMany({
      where: {
        eventId,
        responsibleUserId: user.id,
        status: { notIn: [...CLOSED_TASK_STATUSES] },
      },
      select,
      orderBy: [...orderBy],
    }),
    db.eventTask.findMany({
      where: {
        eventId,
        reviewerUserId: user.id,
        approvalRequired: true,
        approvedAt: null,
        status: { not: TaskStatus.CANCELLED },
      },
      select,
      orderBy: [...orderBy],
    }),
  ]);
  return {
    myTasks,
    myReviews,
    phases: calculatePhaseProgress(
      groups.map((row) => ({
        phase: row.phase,
        status: row.status,
        count: row._count._all,
      })),
    ),
  };
}
