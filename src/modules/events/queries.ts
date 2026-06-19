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

const eventListInclude = {
  eventLead: {
    select: {
      id: true,
      name: true,
    },
  },
  tasks: {
    select: {
      status: true,
      dueDate: true,
      isCritical: true,
    },
  },
} satisfies Prisma.EventInclude;

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
  participants: {
    select: {
      id: true,
    },
  },
} satisfies Prisma.EventInclude;

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getPeriodFilter(period: EventPeriod, today: Date) {
  switch (period) {
    case "upcoming":
      return { gte: today };
    case "next30":
      return { gte: today, lte: addDays(today, 30) };
    case "next90":
      return { gte: today, lte: addDays(today, 90) };
    case "past":
      return { lt: today };
    case "all":
      return undefined;
  }
}

export async function getEventListData(filters: EventListFilters) {
  await requireEventReadAccess();
  const db = getDb();
  const today = getTodayUtc();
  const where: Prisma.EventWhereInput = {
    eventDate: getPeriodFilter(filters.period, today),
    format: filters.format,
    eventLeadId: filters.eventLeadId,
    tasks: filters.criticalOnly
      ? {
          some: {
            isCritical: true,
            status: {
              notIn: [...CLOSED_TASK_STATUSES],
            },
          },
        }
      : undefined,
  };

  const events = await db.event.findMany({
    where,
    include: eventListInclude,
    orderBy: [{ eventDate: "asc" }, { title: "asc" }],
  });
  const formatRecords = await db.event.findMany({
    where: { format: { not: null } },
    select: { format: true },
    distinct: ["format"],
    orderBy: { format: "asc" },
  });
  const eventLeads = await db.user.findMany({
    where: { leadEvents: { some: {} } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const totalEvents = await db.event.count();

  return {
    events: events.map((event) => ({
      ...event,
      metrics: calculateTaskMetrics(event.tasks, today),
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
    participantMetrics: { total: event.participants.length },
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
