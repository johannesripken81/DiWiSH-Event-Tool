import { EventPhase, Prisma, TaskStatus } from "@/generated/prisma/client";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { CLOSED_TASK_STATUSES, getTodayUtc } from "@/modules/events/metrics";
import {
  calculateReadinessScoreFromStats,
  type ReadinessStats,
} from "@/modules/events/readiness";

export type EventPeriod = "all" | "upcoming" | "next30" | "next90" | "past";

export type EventListFilters = {
  period: EventPeriod;
  format?: string;
  eventLeadId?: string;
  criticalOnly: boolean;
  search?: string;
};

export const eventListPageSize = 50;

const eventCockpitSelect = {
  id: true,
  title: true,
  description: true,
  eventDate: true,
  startTime: true,
  endTime: true,
  location: true,
  format: true,
  goal: true,
  targetAudience: true,
  eventLeadId: true,
  communicationOwnerId: true,
  registrationUrl: true,
  feedbackFormUrl: true,
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
  evaluation: true,
  _count: {
    select: {
      participants: true,
    },
  },
} satisfies Prisma.EventSelect;

const cockpitTaskSelect = {
  id: true,
  title: true,
  description: true,
  phase: true,
  status: true,
  priority: true,
  dueDate: true,
  isCritical: true,
  responsibleUserId: true,
  responsibleUser: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.EventTaskSelect;

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

type CountRow = {
  count: number;
};

type TaskMetricsRow = {
  completedTasks: number;
  criticalOpenTasks: number;
  openTasks: number;
  overdueTasks: number;
  totalTasks: number;
};

type TaskSummaryRow = {
  manualOverrideCount: number;
  taskCount: number;
  tasksWithOffset: number;
};

type AuditLogRow = {
  action: string;
  createdAt: Date | string;
  entityId: string;
  entityLabel: string | null;
  entityType: string;
  id: string;
  newValue: Prisma.JsonValue | null;
  oldValue: Prisma.JsonValue | null;
  userId: string | null;
  userName: string | null;
};

const emptyReadinessStats: ReadinessStats = {
  communicationRemaining: 0,
  communicationTotal: 0,
  conceptRemaining: 0,
  conceptTotal: 0,
  followUpTotal: 0,
  followUpUnprepared: 0,
  operationsRemaining: 0,
  operationsTotal: 0,
  onsiteRolesRemaining: 0,
  onsiteRolesTotal: 0,
  participantsRemaining: 0,
  participantsTotal: 0,
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
  const searchPattern = filters.search
    ? `%${filters.search.trim()}%`
    : undefined;
  const conditions = [
    getPeriodSqlFilter(filters.period, today),
    filters.format ? Prisma.sql`e.format = ${filters.format}` : null,
    filters.eventLeadId
      ? Prisma.sql`e."eventLeadId" = ${filters.eventLeadId}`
      : null,
    searchPattern
      ? Prisma.sql`(
          e.title ILIKE ${searchPattern}
          OR COALESCE(e.location, '') ILIKE ${searchPattern}
          OR COALESCE(e.format, '') ILIKE ${searchPattern}
          OR COALESCE(u.name, '') ILIKE ${searchPattern}
        )`
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

export async function getEventListData(filters: EventListFilters, page = 1) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const whereSql = getEventListWhereSql(filters, today);
  const requestedPage = Math.max(1, page);
  const openStatusFilter = Prisma.sql`NOT IN (${Prisma.join([
    ...CLOSED_TASK_STATUSES,
  ])})`;

  const [filteredCountRows, formatRecords, eventLeads, totalEvents] =
    await Promise.all([
      db.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM "Event" e
        LEFT JOIN "User" u ON u.id = e."eventLeadId"
        ${whereSql}
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
    ]);
  const filteredEvents = filteredCountRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredEvents / eventListPageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const eventRows = await db.$queryRaw<EventListRow[]>(Prisma.sql`
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
      LIMIT ${eventListPageSize}
      OFFSET ${(currentPage - 1) * eventListPageSize}
    `);

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
    filteredEvents,
    pagination: {
      currentPage,
      pageSize: eventListPageSize,
      totalItems: filteredEvents,
      totalPages,
    },
    totalEvents,
  };
}

export async function getEventCockpitOverview(id: string) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const event = await db.event.findUnique({
    where: { id },
    select: eventCockpitSelect,
  });

  if (!event) {
    return null;
  }

  const openStatusFilter = Prisma.sql`NOT IN (${Prisma.join([
    ...CLOSED_TASK_STATUSES,
  ])})`;
  const [metricsRows, taskSummaryRows, readinessRows] = await Promise.all([
    db.$queryRaw<TaskMetricsRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE t.status::text <> ${TaskStatus.CANCELLED})::int AS "totalTasks",
        COUNT(*) FILTER (WHERE t.status::text = ${TaskStatus.COMPLETED})::int AS "completedTasks",
        COUNT(*) FILTER (WHERE t.status::text ${openStatusFilter})::int AS "openTasks",
        COUNT(*) FILTER (
          WHERE t.status::text ${openStatusFilter}
            AND t."dueDate" IS NOT NULL
            AND t."dueDate" < ${today}
        )::int AS "overdueTasks",
        COUNT(*) FILTER (
          WHERE t.status::text ${openStatusFilter}
            AND t."isCritical" = true
        )::int AS "criticalOpenTasks"
      FROM "EventTask" t
      WHERE t."eventId" = ${id}
    `),
    db.$queryRaw<TaskSummaryRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "taskCount",
        COUNT(*) FILTER (WHERE t."offsetDays" IS NOT NULL)::int AS "tasksWithOffset",
        COUNT(*) FILTER (
          WHERE t."offsetDays" IS NOT NULL
            AND t."isDueDateManuallyOverridden" = true
        )::int AS "manualOverrideCount"
      FROM "EventTask" t
      WHERE t."eventId" = ${id}
    `),
    db.$queryRaw<ReadinessStats[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t."isCritical" = true
            AND t.phase::text IN (${Prisma.join([
              EventPhase.CONCEPTION,
              EventPhase.FOUR_EYES_REVIEW,
            ])})
        )::int AS "conceptTotal",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.status::text <> ${TaskStatus.COMPLETED}
            AND t."isCritical" = true
            AND t.phase::text IN (${Prisma.join([
              EventPhase.CONCEPTION,
              EventPhase.FOUR_EYES_REVIEW,
            ])})
        )::int AS "conceptRemaining",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.phase::text = ${EventPhase.COMMUNICATION}
            AND (t."isCritical" = true OR t."approvalRequired" = true)
        )::int AS "communicationTotal",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.status::text <> ${TaskStatus.COMPLETED}
            AND t.phase::text = ${EventPhase.COMMUNICATION}
            AND (t."isCritical" = true OR t."approvalRequired" = true)
        )::int AS "communicationRemaining",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.phase::text IN (${Prisma.join([
              EventPhase.LOCATION_CATERING,
              EventPhase.TECHNOLOGY,
            ])})
        )::int AS "operationsTotal",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.status::text <> ${TaskStatus.COMPLETED}
            AND t.phase::text IN (${Prisma.join([
              EventPhase.LOCATION_CATERING,
              EventPhase.TECHNOLOGY,
            ])})
        )::int AS "operationsRemaining",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.phase::text = ${EventPhase.EVENT_DAY}
            AND LOWER(t.title) LIKE '%rollen%'
            AND (
              LOWER(t.title) LIKE '%verteil%'
              OR LOWER(t.title) LIKE '%zuweis%'
            )
        )::int AS "onsiteRolesTotal",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.status::text <> ${TaskStatus.COMPLETED}
            AND t.phase::text = ${EventPhase.EVENT_DAY}
            AND LOWER(t.title) LIKE '%rollen%'
            AND (
              LOWER(t.title) LIKE '%verteil%'
              OR LOWER(t.title) LIKE '%zuweis%'
            )
        )::int AS "onsiteRolesRemaining",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.phase::text = ${EventPhase.PARTICIPANT_MANAGEMENT}
        )::int AS "participantsTotal",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.status::text <> ${TaskStatus.COMPLETED}
            AND t.phase::text = ${EventPhase.PARTICIPANT_MANAGEMENT}
        )::int AS "participantsRemaining",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.phase::text IN (${Prisma.join([
              EventPhase.FOLLOW_UP,
              EventPhase.EVALUATION,
            ])})
        )::int AS "followUpTotal",
        COUNT(*) FILTER (
          WHERE t.status::text <> ${TaskStatus.CANCELLED}
            AND t.phase::text IN (${Prisma.join([
              EventPhase.FOLLOW_UP,
              EventPhase.EVALUATION,
            ])})
            AND (t."responsibleUserId" IS NULL OR t."dueDate" IS NULL)
        )::int AS "followUpUnprepared"
      FROM "EventTask" t
      WHERE t."eventId" = ${id}
    `),
  ]);
  const metrics = metricsRows[0] ?? {
    completedTasks: 0,
    criticalOpenTasks: 0,
    openTasks: 0,
    overdueTasks: 0,
    totalTasks: 0,
  };
  const taskSummary = taskSummaryRows[0] ?? {
    manualOverrideCount: 0,
    taskCount: 0,
    tasksWithOffset: 0,
  };

  return {
    event,
    metrics: {
      ...metrics,
      progress: getProgress(metrics.completedTasks, metrics.totalTasks),
    },
    participantMetrics: { total: event._count.participants },
    readiness: calculateReadinessScoreFromStats(
      event,
      readinessRows[0] ?? emptyReadinessStats,
    ),
    taskSummary,
  };
}

export async function getEventCockpitTaskPreviews(id: string) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const [nextDeadlines, overdueTasks, criticalTasks] = await Promise.all([
    db.eventTask.findMany({
      where: {
        eventId: id,
        status: { notIn: [...CLOSED_TASK_STATUSES] },
        dueDate: { gte: today },
      },
      select: cockpitTaskSelect,
      orderBy: [{ dueDate: "asc" }, { title: "asc" }],
      take: 5,
    }),
    db.eventTask.findMany({
      where: {
        eventId: id,
        status: { notIn: [...CLOSED_TASK_STATUSES] },
        dueDate: { lt: today },
      },
      select: cockpitTaskSelect,
      orderBy: [{ dueDate: "asc" }, { title: "asc" }],
      take: 20,
    }),
    db.eventTask.findMany({
      where: {
        eventId: id,
        status: { notIn: [...CLOSED_TASK_STATUSES] },
        isCritical: true,
      },
      select: cockpitTaskSelect,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      take: 20,
    }),
  ]);

  return {
    criticalTasks,
    nextDeadlines,
    overdueTasks,
  };
}

export async function getEventCockpitAuditLogs(id: string, eventTitle: string) {
  await requireEventReadAccess();
  const db = getDb();
  const auditRows = await db.$queryRaw<AuditLogRow[]>(Prisma.sql`
    SELECT
      l.id,
      l."userId",
      l."entityType",
      l."entityId",
      l.action,
      l."oldValue",
      l."newValue",
      l."createdAt",
      u.name AS "userName",
      CASE
        WHEN l."entityType" = 'EventTask'
          THEN COALESCE(t.title, 'Gelöschte Aufgabe')
        ELSE ${eventTitle}
      END AS "entityLabel"
    FROM "AuditLog" l
    LEFT JOIN "User" u ON u.id = l."userId"
    LEFT JOIN "EventTask" t
      ON l."entityType" = 'EventTask'
      AND t.id = l."entityId"
      AND t."eventId" = ${id}
    WHERE (
      l."entityType" = 'Event'
      AND l."entityId" = ${id}
    ) OR (
      l."entityType" = 'EventTask'
      AND t.id IS NOT NULL
    )
    ORDER BY l."createdAt" DESC
    LIMIT 30
  `);
  const taskTitles = new Map(
    auditRows.flatMap((log) =>
      log.entityType === "EventTask" && log.entityLabel
        ? [[log.entityId, log.entityLabel]]
        : [],
    ),
  );

  return auditRows.map((log) => ({
    ...log,
    createdAt: new Date(log.createdAt),
    user: log.userId
      ? {
          id: log.userId,
          name: log.userName ?? "Unbekannt",
        }
      : null,
    entityLabel:
      log.entityType === "EventTask"
        ? (taskTitles.get(log.entityId) ?? "Gelöschte Aufgabe")
        : eventTitle,
  }));
}

export async function getEventCockpit(id: string) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const event = await db.event.findUnique({
    where: { id },
    select: eventCockpitSelect,
  });

  if (!event) {
    return null;
  }

  const openStatusFilter = Prisma.sql`NOT IN (${Prisma.join([
    ...CLOSED_TASK_STATUSES,
  ])})`;
  const [metricsRows, taskSummaryRows, readinessRows, auditRows] =
    await Promise.all([
      db.$queryRaw<TaskMetricsRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE t.status::text <> ${TaskStatus.CANCELLED})::int AS "totalTasks",
          COUNT(*) FILTER (WHERE t.status::text = ${TaskStatus.COMPLETED})::int AS "completedTasks",
          COUNT(*) FILTER (WHERE t.status::text ${openStatusFilter})::int AS "openTasks",
          COUNT(*) FILTER (
            WHERE t.status::text ${openStatusFilter}
              AND t."dueDate" IS NOT NULL
              AND t."dueDate" < ${today}
          )::int AS "overdueTasks",
          COUNT(*) FILTER (
            WHERE t.status::text ${openStatusFilter}
              AND t."isCritical" = true
          )::int AS "criticalOpenTasks"
        FROM "EventTask" t
        WHERE t."eventId" = ${id}
      `),
      db.$queryRaw<TaskSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS "taskCount",
          COUNT(*) FILTER (WHERE t."offsetDays" IS NOT NULL)::int AS "tasksWithOffset",
          COUNT(*) FILTER (
            WHERE t."offsetDays" IS NOT NULL
              AND t."isDueDateManuallyOverridden" = true
          )::int AS "manualOverrideCount"
        FROM "EventTask" t
        WHERE t."eventId" = ${id}
      `),
      db.$queryRaw<ReadinessStats[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t."isCritical" = true
              AND t.phase::text IN (${Prisma.join([
                EventPhase.CONCEPTION,
                EventPhase.FOUR_EYES_REVIEW,
              ])})
          )::int AS "conceptTotal",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.status::text <> ${TaskStatus.COMPLETED}
              AND t."isCritical" = true
              AND t.phase::text IN (${Prisma.join([
                EventPhase.CONCEPTION,
                EventPhase.FOUR_EYES_REVIEW,
              ])})
          )::int AS "conceptRemaining",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.phase::text = ${EventPhase.COMMUNICATION}
              AND (t."isCritical" = true OR t."approvalRequired" = true)
          )::int AS "communicationTotal",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.status::text <> ${TaskStatus.COMPLETED}
              AND t.phase::text = ${EventPhase.COMMUNICATION}
              AND (t."isCritical" = true OR t."approvalRequired" = true)
          )::int AS "communicationRemaining",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.phase::text IN (${Prisma.join([
                EventPhase.LOCATION_CATERING,
                EventPhase.TECHNOLOGY,
              ])})
          )::int AS "operationsTotal",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.status::text <> ${TaskStatus.COMPLETED}
              AND t.phase::text IN (${Prisma.join([
                EventPhase.LOCATION_CATERING,
                EventPhase.TECHNOLOGY,
              ])})
          )::int AS "operationsRemaining",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.phase::text = ${EventPhase.EVENT_DAY}
              AND LOWER(t.title) LIKE '%rollen%'
              AND (
                LOWER(t.title) LIKE '%verteil%'
                OR LOWER(t.title) LIKE '%zuweis%'
              )
          )::int AS "onsiteRolesTotal",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.status::text <> ${TaskStatus.COMPLETED}
              AND t.phase::text = ${EventPhase.EVENT_DAY}
              AND LOWER(t.title) LIKE '%rollen%'
              AND (
                LOWER(t.title) LIKE '%verteil%'
                OR LOWER(t.title) LIKE '%zuweis%'
              )
          )::int AS "onsiteRolesRemaining",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.phase::text = ${EventPhase.PARTICIPANT_MANAGEMENT}
          )::int AS "participantsTotal",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.status::text <> ${TaskStatus.COMPLETED}
              AND t.phase::text = ${EventPhase.PARTICIPANT_MANAGEMENT}
          )::int AS "participantsRemaining",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.phase::text IN (${Prisma.join([
                EventPhase.FOLLOW_UP,
                EventPhase.EVALUATION,
              ])})
          )::int AS "followUpTotal",
          COUNT(*) FILTER (
            WHERE t.status::text <> ${TaskStatus.CANCELLED}
              AND t.phase::text IN (${Prisma.join([
                EventPhase.FOLLOW_UP,
                EventPhase.EVALUATION,
              ])})
              AND (t."responsibleUserId" IS NULL OR t."dueDate" IS NULL)
          )::int AS "followUpUnprepared"
        FROM "EventTask" t
        WHERE t."eventId" = ${id}
      `),
      db.$queryRaw<AuditLogRow[]>(Prisma.sql`
        SELECT
          l.id,
          l."userId",
          l."entityType",
          l."entityId",
          l.action,
          l."oldValue",
          l."newValue",
          l."createdAt",
          u.name AS "userName",
          CASE
            WHEN l."entityType" = 'EventTask'
              THEN COALESCE(t.title, 'GelÃ¶schte Aufgabe')
            ELSE ${event.title}
          END AS "entityLabel"
        FROM "AuditLog" l
        LEFT JOIN "User" u ON u.id = l."userId"
        LEFT JOIN "EventTask" t
          ON l."entityType" = 'EventTask'
          AND t.id = l."entityId"
          AND t."eventId" = ${id}
        WHERE (
          l."entityType" = 'Event'
          AND l."entityId" = ${id}
        ) OR (
          l."entityType" = 'EventTask'
          AND t.id IS NOT NULL
        )
        ORDER BY l."createdAt" DESC
        LIMIT 30
      `),
    ]);
  const [nextDeadlines, overdueTasks, criticalTasks] = await Promise.all([
    db.eventTask.findMany({
      where: {
        eventId: id,
        status: { notIn: [...CLOSED_TASK_STATUSES] },
        dueDate: { gte: today },
      },
      select: cockpitTaskSelect,
      orderBy: [{ dueDate: "asc" }, { title: "asc" }],
      take: 5,
    }),
    db.eventTask.findMany({
      where: {
        eventId: id,
        status: { notIn: [...CLOSED_TASK_STATUSES] },
        dueDate: { lt: today },
      },
      select: cockpitTaskSelect,
      orderBy: [{ dueDate: "asc" }, { title: "asc" }],
      take: 20,
    }),
    db.eventTask.findMany({
      where: {
        eventId: id,
        status: { notIn: [...CLOSED_TASK_STATUSES] },
        isCritical: true,
      },
      select: cockpitTaskSelect,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      take: 20,
    }),
  ]);
  const metrics = metricsRows[0] ?? {
    completedTasks: 0,
    criticalOpenTasks: 0,
    openTasks: 0,
    overdueTasks: 0,
    totalTasks: 0,
  };
  const taskSummary = taskSummaryRows[0] ?? {
    manualOverrideCount: 0,
    taskCount: 0,
    tasksWithOffset: 0,
  };
  const taskTitles = new Map(
    auditRows.flatMap((log) =>
      log.entityType === "EventTask" && log.entityLabel
        ? [[log.entityId, log.entityLabel]]
        : [],
    ),
  );

  return {
    event,
    metrics: {
      ...metrics,
      progress: getProgress(metrics.completedTasks, metrics.totalTasks),
    },
    participantMetrics: { total: event._count.participants },
    readiness: calculateReadinessScoreFromStats(
      event,
      readinessRows[0] ?? emptyReadinessStats,
    ),
    nextDeadlines,
    overdueTasks,
    criticalTasks,
    taskSummary,
    auditLogs: auditRows.map((log) => ({
      ...log,
      createdAt: new Date(log.createdAt),
      user: log.userId
        ? {
            id: log.userId,
            name: log.userName ?? "Unbekannt",
          }
        : null,
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
