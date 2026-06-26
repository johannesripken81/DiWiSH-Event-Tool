import { Prisma, TaskStatus } from "@/generated/prisma/client";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import {
  calculateTaskMetrics,
  CLOSED_TASK_STATUSES,
  getTodayUtc,
  isOpenTask,
  isOverdueTask,
} from "@/modules/events/metrics";
import { compareTasksByDueDate } from "@/modules/events/presentation";
import { calculateReadinessScore } from "@/modules/events/readiness";

export type EventPeriod = "all" | "upcoming" | "next30" | "next90" | "past";

export type EventListFilters = {
  period: EventPeriod;
  format?: string;
  eventLeadId?: string;
  criticalOnly: boolean;
};

const eventDetailInclude = {
  eventLead: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  coLead: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  communicationOwner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  tasks: {
    select: {
      id: true,
      title: true,
      phase: true,
      status: true,
      priority: true,
      dueDate: true,
      offsetDays: true,
      isDueDateManuallyOverridden: true,
      isCritical: true,
      approvalRequired: true,
      responsibleUserId: true,
      responsibleUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  evaluation: true,
  _count: {
    select: {
      participants: true,
    },
  },
} satisfies Prisma.EventInclude;

type EventListRow = {
  id: string;
  title: string;
  eventDate: Date | string;
  format: string | null;
  eventLeadId: string | null;
  eventLeadName: string | null;
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  criticalOpenTasks: number;
};

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getProgress(completedTasks: number, totalTasks: number) {
  return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
}

function getPeriodSqlFilter(period: EventPeriod, today: Date) {
  switch (period) {
    case "upcoming":
      return Prisma.sql`e."eventDate" >= ${today}`;
    case "next30":
      return Prisma.sql`e."eventDate" >= ${today} AND e."eventDate" <= ${addDays(
        today,
        30,
      )}`;
    case "next90":
      return Prisma.sql`e."eventDate" >= ${today} AND e."eventDate" <= ${addDays(
        today,
        90,
      )}`;
    case "past":
      return Prisma.sql`e."eventDate" < ${today}`;
    case "all":
      return null;
  }
}

function getEventListWhereSql(filters: EventListFilters, today: Date) {
  const conditions = [
    getPeriodSqlFilter(filters.period, today),
    filters.format ? Prisma.sql`e.format = ${filters.format}` : null,
    filters.eventLeadId
      ? Prisma.sql`e."eventLeadId" = ${filters.eventLeadId}`
      : null,
    filters.criticalOnly
      ? Prisma.sql`EXISTS (
          SELECT 1
          FROM "EventTask" critical_task
          WHERE critical_task."eventId" = e.id
            AND critical_task."isCritical" = true
            AND critical_task.status::text NOT IN (${Prisma.join([
              ...CLOSED_TASK_STATUSES,
            ])})
        )`
      : null,
  ].filter((condition): condition is Prisma.Sql => condition !== null);

  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

export async function getEventListData(filters: EventListFilters) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const whereSql = getEventListWhereSql(filters, today);
  const openStatusFilter = Prisma.sql`NOT IN (${Prisma.join([
    ...CLOSED_TASK_STATUSES,
  ])})`;

  const [eventRows, formatRecords, eventLeads, totalEvents] = await Promise.all(
    [
      db.$queryRaw<EventListRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.title,
        e."eventDate",
        e.format,
        u.id AS "eventLeadId",
        u.name AS "eventLeadName",
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
      LEFT JOIN "User" u ON u.id = e."eventLeadId"
      LEFT JOIN "EventTask" t ON t."eventId" = e.id
      ${whereSql}
      GROUP BY e.id, u.id, u.name
      ORDER BY e."eventDate" ASC, e.title ASC
    `),
      db.event.findMany({
        where: { format: { not: null } },
        select: { format: true },
        distinct: ["format"],
        orderBy: { format: "asc" },
      }),
      db.user.findMany({
        where: { leadEvents: { some: {} } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.event.count(),
    ],
  );

  return {
    events: eventRows.map((event) => ({
      id: event.id,
      title: event.title,
      eventDate: new Date(event.eventDate),
      format: event.format,
      eventLead: event.eventLeadId
        ? {
            id: event.eventLeadId,
            name: event.eventLeadName ?? "Unbekannt",
          }
        : null,
      metrics: {
        totalTasks: event.totalTasks,
        completedTasks: event.completedTasks,
        openTasks: event.openTasks,
        overdueTasks: event.overdueTasks,
        criticalOpenTasks: event.criticalOpenTasks,
        progress: getProgress(event.completedTasks, event.totalTasks),
      },
    })),
    formats: formatRecords.flatMap(({ format }) => (format ? [format] : [])),
    eventLeads,
    totalEvents,
  };
}

export async function getEventCockpit(id: string) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const event = await db.event.findUnique({
    where: { id },
    include: eventDetailInclude,
  });

  if (!event) {
    return null;
  }

  const taskTitles = new Map(event.tasks.map((task) => [task.id, task.title]));
  const auditLogs = await db.auditLog.findMany({
    where: {
      OR: [
        {
          entityType: "Event",
          entityId: event.id,
        },
        {
          entityType: "EventTask",
          entityId: { in: event.tasks.map((task) => task.id) },
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  const openTasks = event.tasks.filter(isOpenTask).sort(compareTasksByDueDate);
  const overdueTasks = openTasks.filter((task) => isOverdueTask(task, today));
  const nextDeadlines = openTasks
    .filter((task) => task.dueDate !== null && task.dueDate >= today)
    .slice(0, 5);
  const criticalTasks = openTasks.filter((task) => task.isCritical);

  return {
    event,
    metrics: calculateTaskMetrics(event.tasks, today),
    participantMetrics: { total: event._count.participants },
    readiness: calculateReadinessScore(event, event.tasks),
    nextDeadlines,
    overdueTasks,
    criticalTasks,
    auditLogs: auditLogs.map((log) => ({
      ...log,
      entityLabel:
        log.entityType === "EventTask"
          ? (taskTitles.get(log.entityId) ?? "Gelöschte Aufgabe")
          : event.title,
    })),
  };
}

export function isEventPeriod(value: string | undefined): value is EventPeriod {
  return (
    value === "all" ||
    value === "upcoming" ||
    value === "next30" ||
    value === "next90" ||
    value === "past"
  );
}

export const openTaskStatuses = Object.values(TaskStatus).filter(
  (status) =>
    status !== TaskStatus.COMPLETED && status !== TaskStatus.CANCELLED,
);
