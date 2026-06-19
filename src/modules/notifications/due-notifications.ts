import { NotificationType, TaskStatus } from "@/generated/prisma/enums";
import { getDb } from "@/lib/db";
import {
  defaultNotificationSettings,
  type NotificationSettings,
} from "@/modules/settings/settings";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const NOTIFICATION_TRANSACTION_MAX_WAIT_MS = 10_000;
const NOTIFICATION_TRANSACTION_TIMEOUT_MS = 30_000;

type ReminderNotificationType =
  | typeof NotificationType.TASK_DUE_IN_7_DAYS
  | typeof NotificationType.TASK_DUE_IN_3_DAYS
  | typeof NotificationType.TASK_DUE_TODAY
  | typeof NotificationType.TASK_OVERDUE_1_DAY;

export type DueNotificationTask = {
  id: string;
  title: string;
  dueDate: Date | null;
  status: TaskStatus;
  isCritical: boolean;
  reminderEnabled: boolean;
  responsibleUserId: string | null;
  reviewerUserId: string | null;
  event: {
    title: string;
    eventLeadId: string | null;
  };
};

export type DueNotificationPlan = {
  eventTaskId: string;
  userId: string;
  type:
    | ReminderNotificationType
    | typeof NotificationType.CRITICAL_TASK_OVERDUE;
  deduplicationKey: string;
  title: string;
  message: string;
  isEscalation: boolean;
};

export type GenerateDueNotificationsOptions = {
  now?: Date;
  db?: ReturnType<typeof getDb>;
  rules?: NotificationSettings;
};

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number) {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function getDaysUntilDue(dueDate: Date, today: Date) {
  return Math.round(
    (startOfUtcDay(dueDate).getTime() - startOfUtcDay(today).getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

function formatDueDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function createPlan(
  task: DueNotificationTask,
  userId: string,
  type: DueNotificationPlan["type"],
  title: string,
  message: string,
  isEscalation = false,
): DueNotificationPlan {
  return {
    eventTaskId: task.id,
    userId,
    type,
    deduplicationKey: `${task.id}:${type}`,
    title,
    message,
    isEscalation,
  };
}

export function planDueNotifications(
  task: DueNotificationTask,
  today: Date,
  rules: NotificationSettings = defaultNotificationSettings,
): DueNotificationPlan[] {
  if (
    task.status === TaskStatus.COMPLETED ||
    task.status === TaskStatus.CANCELLED ||
    !task.reminderEnabled ||
    !task.dueDate
  ) {
    return [];
  }

  const plans: DueNotificationPlan[] = [];
  const daysUntilDue = getDaysUntilDue(task.dueDate, today);
  const dueDateLabel = formatDueDate(task.dueDate);
  const responsibleUserId = task.responsibleUserId;
  const taskContext = `„${task.title}“ im Event „${task.event.title}“`;

  if (rules.dueIn7DaysEnabled && responsibleUserId && daysUntilDue === 7) {
    plans.push(
      createPlan(
        task,
        responsibleUserId,
        NotificationType.TASK_DUE_IN_7_DAYS,
        "Aufgabe in 7 Tagen fällig",
        `${taskContext} ist am ${dueDateLabel} fällig.`,
      ),
    );
  }

  if (rules.dueIn3DaysEnabled && responsibleUserId && daysUntilDue === 3) {
    plans.push(
      createPlan(
        task,
        responsibleUserId,
        NotificationType.TASK_DUE_IN_3_DAYS,
        "Aufgabe in 3 Tagen fällig",
        `${taskContext} ist am ${dueDateLabel} fällig.`,
      ),
    );
  }

  if (rules.dueTodayEnabled && responsibleUserId && daysUntilDue === 0) {
    plans.push(
      createPlan(
        task,
        responsibleUserId,
        NotificationType.TASK_DUE_TODAY,
        "Aufgabe heute fällig",
        `${taskContext} ist heute fällig.`,
      ),
    );
  }

  if (rules.overdueOneDayEnabled && responsibleUserId && daysUntilDue === -1) {
    plans.push(
      createPlan(
        task,
        responsibleUserId,
        NotificationType.TASK_OVERDUE_1_DAY,
        "Aufgabe seit einem Tag überfällig",
        `${taskContext} war am ${dueDateLabel} fällig.`,
      ),
    );
  }

  if (rules.criticalOverdueEnabled && task.isCritical && daysUntilDue < 0) {
    const escalationUserId =
      task.event.eventLeadId ?? task.reviewerUserId ?? task.responsibleUserId;

    if (escalationUserId) {
      plans.push(
        createPlan(
          task,
          escalationUserId,
          NotificationType.CRITICAL_TASK_OVERDUE,
          "Kritische Aufgabe überfällig",
          `${taskContext} ist seit ${Math.abs(daysUntilDue)} Tag${
            Math.abs(daysUntilDue) === 1 ? "" : "en"
          } überfällig.`,
          true,
        ),
      );
    }
  }

  return plans;
}

export function filterNewNotificationPlans(
  plans: DueNotificationPlan[],
  existingDeduplicationKeys: Iterable<string>,
) {
  const existingKeys = new Set(existingDeduplicationKeys);

  return plans.filter((plan) => !existingKeys.has(plan.deduplicationKey));
}

export async function generateDueNotifications(
  options: GenerateDueNotificationsOptions = {},
) {
  const db = options.db ?? getDb();
  const now = options.now ?? new Date();
  const rules = options.rules ?? defaultNotificationSettings;
  const today = startOfUtcDay(now);
  const latestRelevantDueDate = addUtcDays(today, 7);

  return db.$transaction(
    async (transaction) => {
      const tasks = await transaction.eventTask.findMany({
        where: {
          status: {
            notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
          },
          reminderEnabled: true,
          dueDate: {
            not: null,
            lte: latestRelevantDueDate,
          },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
          isCritical: true,
          reminderEnabled: true,
          responsibleUserId: true,
          reviewerUserId: true,
          event: {
            select: {
              title: true,
              eventLeadId: true,
            },
          },
        },
      });

      const plans = tasks.flatMap((task) =>
        planDueNotifications(task, today, rules),
      );

      if (plans.length === 0) {
        return {
          checkedTasks: tasks.length,
          createdNotifications: 0,
          reminderNotifications: 0,
          escalationNotifications: 0,
        };
      }

      const existingNotifications = await transaction.notification.findMany({
        where: {
          deduplicationKey: {
            in: plans.map((plan) => plan.deduplicationKey),
          },
        },
        select: {
          deduplicationKey: true,
        },
      });
      const pendingPlans = filterNewNotificationPlans(
        plans,
        existingNotifications.flatMap(({ deduplicationKey }) =>
          deduplicationKey ? [deduplicationKey] : [],
        ),
      );

      if (pendingPlans.length === 0) {
        return {
          checkedTasks: tasks.length,
          createdNotifications: 0,
          reminderNotifications: 0,
          escalationNotifications: 0,
        };
      }

      const createResult = await transaction.notification.createMany({
        data: pendingPlans.map((plan) => ({
          userId: plan.userId,
          eventTaskId: plan.eventTaskId,
          type: plan.type,
          deduplicationKey: plan.deduplicationKey,
          title: plan.title,
          message: plan.message,
          createdAt: now,
        })),
        skipDuplicates: true,
      });

      const reminderTaskIds = [
        ...new Set(
          pendingPlans
            .filter((plan) => !plan.isEscalation)
            .map((plan) => plan.eventTaskId),
        ),
      ];
      const escalationTaskIds = [
        ...new Set(
          pendingPlans
            .filter((plan) => plan.isEscalation)
            .map((plan) => plan.eventTaskId),
        ),
      ];

      if (reminderTaskIds.length > 0) {
        await transaction.eventTask.updateMany({
          where: { id: { in: reminderTaskIds } },
          data: { reminderSentAt: now },
        });
      }

      if (escalationTaskIds.length > 0) {
        await transaction.eventTask.updateMany({
          where: { id: { in: escalationTaskIds } },
          data: { escalationSentAt: now },
        });
      }

      return {
        checkedTasks: tasks.length,
        createdNotifications: createResult.count,
        reminderNotifications: pendingPlans.filter((plan) => !plan.isEscalation)
          .length,
        escalationNotifications: pendingPlans.filter(
          (plan) => plan.isEscalation,
        ).length,
      };
    },
    {
      maxWait: NOTIFICATION_TRANSACTION_MAX_WAIT_MS,
      timeout: NOTIFICATION_TRANSACTION_TIMEOUT_MS,
    },
  );
}
