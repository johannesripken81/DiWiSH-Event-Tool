import { Prisma } from "@/generated/prisma/client";

export const AuditAction = {
  EVENT_CREATED: "EVENT_CREATED",
  EVENT_UPDATED: "EVENT_UPDATED",
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",
  TASK_DUE_DATE_CHANGED: "TASK_DUE_DATE_CHANGED",
  TASK_RESPONSIBLE_CHANGED: "TASK_RESPONSIBLE_CHANGED",
  TASK_APPROVED: "TASK_APPROVED",
  TASK_COMPLETED: "TASK_COMPLETED",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

export type AuditValue = string | number | boolean | null;
export type AuditSnapshot = Record<string, AuditValue>;

type AuditLogClient = Pick<Prisma.TransactionClient, "auditLog">;

type CreateAuditLogInput = {
  userId?: string | null;
  entityType: "Event" | "EventTask";
  entityId: string;
  action: AuditActionValue;
  oldValue?: AuditSnapshot;
  newValue?: AuditSnapshot;
};

export function getChangedAuditValues(
  oldValue: AuditSnapshot,
  newValue: AuditSnapshot,
) {
  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  const changedOldValue: AuditSnapshot = {};
  const changedNewValue: AuditSnapshot = {};

  for (const key of keys) {
    if (oldValue[key] === newValue[key]) {
      continue;
    }

    changedOldValue[key] = oldValue[key] ?? null;
    changedNewValue[key] = newValue[key] ?? null;
  }

  return {
    hasChanges: Object.keys(changedOldValue).length > 0,
    oldValue: changedOldValue,
    newValue: changedNewValue,
  };
}

export async function createAuditLog(
  client: AuditLogClient,
  input: CreateAuditLogInput,
) {
  return client.auditLog.create({
    data: {
      userId: input.userId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      oldValue: input.oldValue,
      newValue: input.newValue,
    },
  });
}
