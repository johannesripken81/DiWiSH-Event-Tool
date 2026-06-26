import {
  EventPhase,
  Prisma,
  TaskPriority,
  TaskStatus,
} from "@/generated/prisma/client";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { CLOSED_TASK_STATUSES, getTodayUtc } from "@/modules/events/metrics";
import { getCachedUserOptions } from "@/modules/settings/reference-data";

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

export const taskPlanningPageSize = 50;

const taskReadinessAreaLabels: Record<TaskReadinessAreaFilter, string> = {
  concept: "Kritische Konzeptaufgaben",
  communication: "Kommunikation bereit und freigegeben",
  operations: "Location, Catering und Technik geklärt",
  onsiteRoles: "Vor-Ort-Rollen verteilt",
  participants: "Teilnehmermanagement gepflegt",
  followUp: "Feedback und Nachbereitung vorbereitet",
};

type TaskOverviewEventRow = {
  id: string;
  title: string;
  eventDate: Date | string;
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  criticalOpenTasks: number;
};

function getProgress(completedTasks: number, totalTasks: number) {
  return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
}

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
  page = 1,
) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const requestedPage = Math.max(1, page);
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

  const [event, users, totalTasks, filteredTasks] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    }),
    getCachedUserOptions(),
    db.eventTask.count({ where: { eventId } }),
    db.eventTask.count({ where }),
  ]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTasks / taskPlanningPageSize),
  );
  const currentPage = Math.min(requestedPage, totalPages);
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
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }],
    skip: (currentPage - 1) * taskPlanningPageSize,
    take: taskPlanningPageSize,
  });

  return {
    event,
    tasks,
    users,
    filteredTasks,
    totalTasks,
    today,
    pagination: {
      currentPage,
      pageSize: taskPlanningPageSize,
      totalItems: filteredTasks,
      totalPages,
    },
  };
}

export async function getTaskOverviewEvents() {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const openStatusFilter = Prisma.sql`NOT IN (${Prisma.join([
    ...CLOSED_TASK_STATUSES,
  ])})`;
  const rows = await db.$queryRaw<TaskOverviewEventRow[]>(Prisma.sql`
    SELECT
      e.id,
      e.title,
      e."eventDate",
      COUNT(t.id) FILTER (WHERE t.status::text <> ${TaskStatus.CANCELLED})::int AS "totalTasks",
      COUNT(t.id) FILTER (WHERE t.status::text = ${TaskStatus.COMPLETED})::int AS "completedTasks",
      COUNT(t.id) FILTER (WHERE t.status::text ${openStatusFilter})::int AS "openTasks",
      COUNT(t.id) FILTER (
        WHERE t.status::text ${openStatusFilter}
          AND t."dueDate" IS NOT NULL
          AND t."dueDate" < ${today}
      )::int AS "overdueTasks",
      COUNT(t.id) FILTER (
        WHERE t.status::text ${openStatusFilter}
          AND t."isCritical" = true
      )::int AS "criticalOpenTasks"
    FROM "Event" e
    LEFT JOIN "EventTask" t ON t."eventId" = e.id
    GROUP BY e.id
    ORDER BY e."eventDate" ASC, e.title ASC
  `);

  return rows.map((event) => ({
    id: event.id,
    title: event.title,
    eventDate: new Date(event.eventDate),
    metrics: {
      totalTasks: event.totalTasks,
      completedTasks: event.completedTasks,
      openTasks: event.openTasks,
      overdueTasks: event.overdueTasks,
      criticalOpenTasks: event.criticalOpenTasks,
      progress: getProgress(event.completedTasks, event.totalTasks),
    },
  }));
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
    getCachedUserOptions(),
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
