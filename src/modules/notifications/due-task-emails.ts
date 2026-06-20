import { TaskStatus } from "@/generated/prisma/enums";
import { getDb } from "@/lib/db";
import { formatDate } from "@/modules/events/presentation";
import { getNotificationSettings } from "@/modules/settings/queries";

import {
  getResendEmailConfig,
  sendResendEmail,
  type EmailMessage,
  type SendEmail,
} from "./email";

export const dueTaskEmailDeliveriesKey = "due-task-email-deliveries";

const MAX_STORED_DELIVERIES = 1_000;

type DbClient = ReturnType<typeof getDb>;

export type DueTaskEmailCandidate = {
  id: string;
  title: string;
  dueDate: Date;
  responsibleUser: {
    id: string;
    name: string;
    email: string;
  };
  event: {
    id: string;
    title: string;
  };
};

export type DueTaskEmailDeliveryRecord = {
  key: string;
  taskId: string;
  userId: string;
  email: string;
  dueDate: string;
  sentAt: string;
};

export type DueTaskEmailDeliveryState = {
  sent: Record<string, DueTaskEmailDeliveryRecord>;
};

export type SendDueTaskEmailsOptions = {
  appBaseUrl?: string;
  db?: DbClient;
  from?: string;
  now?: Date;
  replyTo?: string;
  sendEmail?: SendEmail;
};

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getConfiguredAppBaseUrl() {
  const explicitUrl = process.env.APP_BASE_URL?.trim();

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  return vercelUrl ? `https://${vercelUrl.replace(/\/$/, "")}` : "";
}

export function getDueTaskEmailDeliveryKey(task: DueTaskEmailCandidate) {
  return `due-task-email:${task.id}:${formatDateKey(task.dueDate)}`;
}

export function parseDueTaskEmailDeliveryState(
  value: unknown,
): DueTaskEmailDeliveryState {
  if (!value || typeof value !== "object" || !("sent" in value)) {
    return { sent: {} };
  }

  const sent = (value as { sent?: unknown }).sent;

  if (!sent || typeof sent !== "object") {
    return { sent: {} };
  }

  return {
    sent: Object.fromEntries(
      Object.entries(sent).filter(
        (entry): entry is [string, DueTaskEmailDeliveryRecord] => {
          const record = entry[1];

          return (
            Boolean(entry[0]) &&
            Boolean(record) &&
            typeof record === "object" &&
            typeof (record as DueTaskEmailDeliveryRecord).taskId === "string" &&
            typeof (record as DueTaskEmailDeliveryRecord).sentAt === "string"
          );
        },
      ),
    ),
  };
}

export function filterUnsentDueTaskEmailCandidates(
  tasks: DueTaskEmailCandidate[],
  deliveryState: DueTaskEmailDeliveryState,
) {
  return tasks.filter(
    (task) => !deliveryState.sent[getDueTaskEmailDeliveryKey(task)],
  );
}

export function buildDueTaskEmailMessage({
  appBaseUrl = getConfiguredAppBaseUrl(),
  from,
  replyTo,
  task,
}: {
  appBaseUrl?: string;
  from: string;
  replyTo?: string;
  task: DueTaskEmailCandidate;
}): EmailMessage {
  const taskUrl = appBaseUrl
    ? `${appBaseUrl}/events/${task.event.id}/tasks/${task.id}/edit`
    : "";
  const subject = `Aufgabe heute fällig: ${task.title}`;
  const text = [
    `Hallo ${task.responsibleUser.name},`,
    "",
    `die Aufgabe "${task.title}" im Event "${task.event.title}" ist heute fällig (${formatDate(task.dueDate)}).`,
    taskUrl ? `Direkt öffnen: ${taskUrl}` : "",
    "",
    "Viele Grüße",
    "DIWISH Event Tool",
  ]
    .filter((line) => line !== "")
    .join("\n");
  const html = `
    <p>Hallo ${escapeHtml(task.responsibleUser.name)},</p>
    <p>die Aufgabe <strong>${escapeHtml(task.title)}</strong> im Event <strong>${escapeHtml(
      task.event.title,
    )}</strong> ist heute fällig (${escapeHtml(formatDate(task.dueDate))}).</p>
    ${
      taskUrl
        ? `<p><a href="${escapeHtml(taskUrl)}">Aufgabe im DIWISH Event Tool öffnen</a></p>`
        : ""
    }
    <p>Viele Grüße<br />DIWISH Event Tool</p>
  `;

  return {
    from,
    to: task.responsibleUser.email,
    subject,
    text,
    html,
    replyTo,
  };
}

function compactDeliveryState(state: DueTaskEmailDeliveryState) {
  const entries = Object.entries(state.sent).sort(
    ([, first], [, second]) =>
      new Date(second.sentAt).getTime() - new Date(first.sentAt).getTime(),
  );

  return {
    sent: Object.fromEntries(entries.slice(0, MAX_STORED_DELIVERIES)),
  };
}

async function getDueTodayTaskEmailCandidates(db: DbClient, today: Date) {
  const tasks = await db.eventTask.findMany({
    where: {
      dueDate: today,
      reminderEnabled: true,
      responsibleUserId: { not: null },
      status: {
        notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      responsibleUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: [{ event: { title: "asc" } }, { title: "asc" }],
  });

  return tasks.flatMap((task): DueTaskEmailCandidate[] =>
    task.dueDate && task.responsibleUser
      ? [
          {
            id: task.id,
            title: task.title,
            dueDate: task.dueDate,
            responsibleUser: task.responsibleUser,
            event: task.event,
          },
        ]
      : [],
  );
}

export async function sendDueTodayTaskEmails(
  options: SendDueTaskEmailsOptions = {},
) {
  const db = options.db ?? getDb();
  const now = options.now ?? new Date();
  const today = startOfUtcDay(now);
  const notificationSettings = await getNotificationSettings(db);
  const from = options.from ?? process.env.EMAIL_FROM?.trim();
  const replyTo = options.replyTo ?? process.env.EMAIL_REPLY_TO?.trim();
  const sender = options.sendEmail ?? sendResendEmail;
  const emailConfigured = Boolean(
    from && (options.sendEmail || getResendEmailConfig()),
  );

  if (!notificationSettings.dueTodayEnabled) {
    return {
      checkedTasks: 0,
      sentEmails: 0,
      skippedEmails: 0,
      failedEmails: 0,
      emailConfigured,
      disabledBySettings: true,
    };
  }

  const candidates = await getDueTodayTaskEmailCandidates(db, today);
  const setting = await db.appSetting.findUnique({
    where: { key: dueTaskEmailDeliveriesKey },
  });
  const deliveryState = parseDueTaskEmailDeliveryState(setting?.value);
  const pendingCandidates = filterUnsentDueTaskEmailCandidates(
    candidates,
    deliveryState,
  );

  if (!from || !emailConfigured) {
    return {
      checkedTasks: candidates.length,
      sentEmails: 0,
      skippedEmails: pendingCandidates.length,
      failedEmails: 0,
      emailConfigured: false,
      disabledBySettings: false,
    };
  }

  const sentRecords: DueTaskEmailDeliveryRecord[] = [];
  let failedEmails = 0;

  for (const task of pendingCandidates) {
    try {
      await sender(
        buildDueTaskEmailMessage({
          appBaseUrl: options.appBaseUrl,
          from,
          replyTo,
          task,
        }),
      );

      const key = getDueTaskEmailDeliveryKey(task);
      sentRecords.push({
        key,
        taskId: task.id,
        userId: task.responsibleUser.id,
        email: task.responsibleUser.email,
        dueDate: formatDateKey(task.dueDate),
        sentAt: now.toISOString(),
      });
    } catch (error) {
      failedEmails += 1;
      console.error("Due task email could not be sent", error);
    }
  }

  if (sentRecords.length > 0) {
    const latestSetting = await db.appSetting.findUnique({
      where: { key: dueTaskEmailDeliveriesKey },
    });
    const latestState = parseDueTaskEmailDeliveryState(latestSetting?.value);
    const nextState = compactDeliveryState({
      sent: {
        ...latestState.sent,
        ...Object.fromEntries(
          sentRecords.map((record) => [record.key, record]),
        ),
      },
    });

    await db.appSetting.upsert({
      where: { key: dueTaskEmailDeliveriesKey },
      create: { key: dueTaskEmailDeliveriesKey, value: nextState },
      update: { value: nextState },
    });
  }

  return {
    checkedTasks: candidates.length,
    sentEmails: sentRecords.length,
    skippedEmails: candidates.length - pendingCandidates.length,
    failedEmails,
    emailConfigured: true,
    disabledBySettings: false,
  };
}
