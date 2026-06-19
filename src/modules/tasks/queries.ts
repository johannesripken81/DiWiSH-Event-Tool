import {
  EventPhase,
  Prisma,
  TaskPriority,
  TaskStatus,
} from "@/generated/prisma/client";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { CLOSED_TASK_STATUSES, getTodayUtc } from "@/modules/events/metrics";
import { compareTasksByDueDate } from "@/modules/events/presentation";

export type TaskDueFilter = "all" | "overdue" | "next7";

export type EventTaskFilters = {
  status?: TaskStatus;
  phase?: EventPhase;
  responsibleUserId?: string;
  priority?: TaskPriority;
  due: TaskDueFilter;
  criticalOnly: boolean;
};

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getDueDateFilter(filter: TaskDueFilter, today: Date) {
  switch (filter) {
    case "overdue":
      return { lt: today };
    case "next7":
      return { gte: today, lte: addDays(today, 7) };
    case "all":
      return undefined;
  }
}

export async function getEventTaskPlanning(
  eventId: string,
  filters: EventTaskFilters,
) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const where: Prisma.EventTaskWhereInput = {
    eventId,
    status: filters.status,
    phase: filters.phase,
    responsibleUserId: filters.responsibleUserId,
    priority: filters.priority,
    isCritical: filters.criticalOnly ? true : undefined,
    dueDate: getDueDateFilter(filters.due, today),
  };

  if (filters.due !== "all" && !filters.status) {
    where.status = { notIn: [...CLOSED_TASK_STATUSES] };
  }

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      eventDate: true,
    },
  });
  const tasks = await db.eventTask.findMany({
    where,
    include: {
      responsibleUser: {
        select: { id: true, name: true },
      },
      reviewerUser: {
        select: { id: true, name: true },
      },
    },
  });
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
  const totalTasks = await db.eventTask.count({ where: { eventId } });

  return {
    event,
    tasks: tasks.sort(compareTasksByDueDate),
    users,
    totalTasks,
    today,
  };
}

export async function getEventTaskEditorData(eventId: string, taskId?: string) {
  await requireEventReadAccess();
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });
  const task = taskId
    ? await db.eventTask.findFirst({
        where: { id: taskId, eventId },
      })
    : null;
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return { event, task, users };
}

export function isTaskStatus(value: string | undefined): value is TaskStatus {
  return value
    ? Object.values(TaskStatus).includes(value as TaskStatus)
    : false;
}

export function isEventPhase(value: string | undefined): value is EventPhase {
  return value
    ? Object.values(EventPhase).includes(value as EventPhase)
    : false;
}

export function isTaskPriority(
  value: string | undefined,
): value is TaskPriority {
  return value
    ? Object.values(TaskPriority).includes(value as TaskPriority)
    : false;
}

export function isTaskDueFilter(
  value: string | undefined,
): value is TaskDueFilter {
  return value === "all" || value === "overdue" || value === "next7";
}
