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
export type TaskReadinessAreaFilter =
  | "concept"
  | "communication"
  | "operations"
  | "onsiteRoles"
  | "participants"
  | "followUp";

export type EventTaskFilters = {
  status?: TaskStatus;
  phase?: EventPhase;
  responsibleUserId?: string;
  priority?: TaskPriority;
  due: TaskDueFilter;
  criticalOnly: boolean;
  readinessArea?: TaskReadinessAreaFilter;
};

const taskReadinessAreaLabels: Record<TaskReadinessAreaFilter, string> = {
  concept: "Kritische Konzeptaufgaben",
  communication: "Kommunikation bereit und freigegeben",
  operations: "Location, Catering und Technik geklärt",
  onsiteRoles: "Vor-Ort-Rollen verteilt",
  participants: "Teilnehmermanagement gepflegt",
  followUp: "Feedback und Nachbereitung vorbereitet",
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

function getReadinessAreaFilter(
  filter: TaskReadinessAreaFilter | undefined,
): Prisma.EventTaskWhereInput | undefined {
  switch (filter) {
    case "concept":
      return {
        isCritical: true,
        phase: { in: [EventPhase.CONCEPTION, EventPhase.FOUR_EYES_REVIEW] },
      };
    case "communication":
      return {
        phase: EventPhase.COMMUNICATION,
        OR: [{ isCritical: true }, { approvalRequired: true }],
      };
    case "operations":
      return {
        phase: { in: [EventPhase.LOCATION_CATERING, EventPhase.TECHNOLOGY] },
      };
    case "onsiteRoles":
      return { phase: EventPhase.EVENT_DAY };
    case "participants":
      return { phase: EventPhase.PARTICIPANT_MANAGEMENT };
    case "followUp":
      return { phase: { in: [EventPhase.FOLLOW_UP, EventPhase.EVALUATION] } };
    case undefined:
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
    AND: [getReadinessAreaFilter(filters.readinessArea)].filter(
      (filter): filter is Prisma.EventTaskWhereInput => Boolean(filter),
    ),
  };

  if (filters.due !== "all" && !filters.status) {
    where.status = { notIn: [...CLOSED_TASK_STATUSES] };
  }

  const [event, tasks, users, totalTasks] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    }),
    db.eventTask.findMany({
      where,
      include: {
        responsibleUser: {
          select: { id: true, name: true },
        },
        reviewerUser: {
          select: { id: true, name: true },
        },
      },
    }),
    db.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: "asc" },
    }),
    db.eventTask.count({ where: { eventId } }),
  ]);

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
  const [event, task, users] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true },
    }),
    taskId
      ? db.eventTask.findFirst({
          where: { id: taskId, eventId },
        })
      : Promise.resolve(null),
    db.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

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

export function isTaskReadinessAreaFilter(
  value: string | undefined,
): value is TaskReadinessAreaFilter {
  return value ? Object.keys(taskReadinessAreaLabels).includes(value) : false;
}

export function getTaskReadinessAreaLabel(filter: TaskReadinessAreaFilter) {
  return taskReadinessAreaLabels[filter];
}
