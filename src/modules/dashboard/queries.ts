import { Prisma } from "@/generated/prisma/client";
import {
  EventStatus,
  type EventPhase,
  type TaskPriority,
} from "@/generated/prisma/enums";
import { getDb } from "@/lib/db";
import { CLOSED_TASK_STATUSES } from "@/modules/events/metrics";

type DashboardQueryTask = {
  dueDate: string;
  event: {
    eventDate: string;
    id: string;
    title: string;
  };
  id: string;
  isCritical: boolean;
  phase: EventPhase;
  workPackage: string | null;
  priority: TaskPriority;
  responsibleUser: {
    id: string;
    name: string;
  } | null;
  title: string;
};

type DashboardQueryEvent = {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  eventDate: string;
  id: string;
  location: string | null;
  title: string;
};

type DashboardQueryUser = {
  id: string;
  name: string;
};

type DashboardQueryRow = {
  activeEvents: number;
  dashboardTasks: DashboardQueryTask[];
  upcomingEvents: DashboardQueryEvent[];
  users: DashboardQueryUser[];
};

export function getDashboardQuery({
  nextSevenDays,
  selectedResponsibleUserId,
  selectedUnassigned,
  today,
}: {
  nextSevenDays: Date;
  selectedResponsibleUserId?: string;
  selectedUnassigned: boolean;
  today: Date;
}) {
  const responsibleCondition = selectedUnassigned
    ? Prisma.sql`AND t."responsibleUserId" IS NULL`
    : selectedResponsibleUserId
      ? Prisma.sql`AND t."responsibleUserId" = ${selectedResponsibleUserId}`
      : Prisma.empty;
  return Prisma.sql`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM "Event" e
        WHERE e.status::text IN (${Prisma.join([
          EventStatus.DRAFT,
          EventStatus.PLANNING,
          EventStatus.EXECUTION,
          EventStatus.FOLLOW_UP,
        ])})
      ) AS "activeEvents",
      COALESCE(
        (
          SELECT json_agg(task_rows ORDER BY task_rows."dueDate" ASC, CASE task_rows.priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END DESC, task_rows.title ASC)
          FROM (
            SELECT
              t.id,
              t.title,
              t.phase::text AS phase,
              t."workPackage",
              t.priority::text AS priority,
              t."dueDate",
              t."isCritical",
              json_build_object(
                'id', e.id,
                'title', e.title,
                'eventDate', e."eventDate"
              ) AS event,
              CASE
                WHEN u.id IS NULL THEN NULL
                ELSE json_build_object('id', u.id, 'name', u.name)
              END AS "responsibleUser"
            FROM "EventTask" t
            JOIN "Event" e ON e.id = t."eventId"
            LEFT JOIN "User" u ON u.id = t."responsibleUserId"
            WHERE t.status::text NOT IN (${Prisma.join([
              ...CLOSED_TASK_STATUSES,
            ])})
              AND t."dueDate" IS NOT NULL
              AND t."dueDate" <= ${nextSevenDays}
              ${responsibleCondition}
          ) task_rows
        ),
        '[]'::json
      ) AS "dashboardTasks",
      COALESCE(
        (
          SELECT json_agg(event_rows ORDER BY event_rows."eventDate" ASC)
          FROM (
            SELECT e.id, e.title, e.location, e."eventDate",
              (SELECT COUNT(*)::int FROM "EventTask" t WHERE t."eventId" = e.id) AS "totalTasks",
              (SELECT COUNT(*)::int FROM "EventTask" t WHERE t."eventId" = e.id AND t.status::text IN ('COMPLETED', 'CANCELLED')) AS "completedTasks",
              (SELECT COUNT(*)::int FROM "EventTask" t WHERE t."eventId" = e.id AND t.status::text NOT IN ('COMPLETED', 'CANCELLED') AND t."dueDate" < ${today}) AS "overdueTasks"
            FROM "Event" e
            WHERE e.status::text IN (${Prisma.join([EventStatus.DRAFT, EventStatus.PLANNING, EventStatus.EXECUTION, EventStatus.FOLLOW_UP])})
            ORDER BY e."eventDate" ASC
            LIMIT 8
          ) event_rows
        ),
        '[]'::json
      ) AS "upcomingEvents",
      COALESCE(
        (
          SELECT json_agg(user_rows ORDER BY user_rows.name ASC)
          FROM (
            SELECT u.id, u.name
            FROM "User" u
            ORDER BY u.name ASC
          ) user_rows
        ),
        '[]'::json
      ) AS users
  `;
}

export async function getDashboardData(
  options: Parameters<typeof getDashboardQuery>[0],
) {
  const rows = await getDb().$queryRaw<DashboardQueryRow[]>(
    getDashboardQuery(options),
  );
  const row = rows[0] ?? {
    activeEvents: 0,
    dashboardTasks: [],
    upcomingEvents: [],
    users: [],
  };

  return {
    activeEvents: row.activeEvents,
    dashboardTasks: row.dashboardTasks.map((task) => ({
      ...task,
      dueDate: new Date(task.dueDate),
      event: {
        ...task.event,
        eventDate: new Date(task.event.eventDate),
      },
    })),
    upcomingEvents: row.upcomingEvents.map((event) => ({
      ...event,
      progress:
        event.totalTasks === 0
          ? 0
          : Math.round((event.completedTasks / event.totalTasks) * 100),
      eventDate: new Date(event.eventDate),
    })),
    users: row.users,
  };
}
