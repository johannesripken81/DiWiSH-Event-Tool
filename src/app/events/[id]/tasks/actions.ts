"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlannerSyncStatus, TaskStatus } from "@/generated/prisma/client";
import {
  AuditAction,
  createAuditLog,
  getChangedAuditValues,
  type AuditSnapshot,
} from "@/lib/audit-log";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { assertPermission, hasPermission, Permission } from "@/lib/permissions";
import {
  getTaskFormValues,
  optionalTaskValue,
  parseTaskDate,
  taskFormSchema,
  type TaskFormState,
} from "@/modules/tasks/task-form";

function getRelationErrors(
  userIds: Set<string>,
  responsibleUserId: string,
  reviewerUserId: string,
) {
  const fieldErrors: TaskFormState["fieldErrors"] = {};

  if (responsibleUserId && !userIds.has(responsibleUserId)) {
    fieldErrors.responsibleUserId = [
      "Die ausgewählte verantwortliche Person existiert nicht.",
    ];
  }

  if (reviewerUserId && !userIds.has(reviewerUserId)) {
    fieldErrors.reviewerUserId = [
      "Die ausgewählte prüfende Person existiert nicht.",
    ];
  }

  return fieldErrors;
}

async function validateTaskForm(formData: FormData): Promise<
  | { state: TaskFormState; input?: never }
  | {
      state?: never;
      input: ReturnType<typeof taskFormSchema.parse>;
    }
> {
  const values = getTaskFormValues(formData);
  const result = taskFormSchema.safeParse(values);

  if (!result.success) {
    return {
      state: {
        values,
        fieldErrors: result.error.flatten().fieldErrors,
        formError: "Bitte prüfe die markierten Eingaben.",
      },
    };
  }

  const db = getDb();
  const selectedUserIds = [
    result.data.responsibleUserId,
    result.data.reviewerUserId,
  ].filter(Boolean);
  const users = selectedUserIds.length
    ? await db.user.findMany({
        where: { id: { in: selectedUserIds } },
        select: { id: true },
      })
    : [];
  const relationErrors = getRelationErrors(
    new Set(users.map((user) => user.id)),
    result.data.responsibleUserId,
    result.data.reviewerUserId,
  );

  if (Object.keys(relationErrors).length > 0) {
    return {
      state: {
        values,
        fieldErrors: relationErrors,
        formError: "Mindestens eine ausgewählte Person ist nicht verfügbar.",
      },
    };
  }

  return { input: result.data };
}

function revalidateTaskViews(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/tasks`);
  revalidatePath("/events");
  revalidatePath("/tasks");
}

type TaskAuditSource = {
  title: string;
  description: string | null;
  phase: string;
  responsibleUserId: string | null;
  reviewerUserId: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  approvalRequired: boolean;
  isCritical: boolean;
  completedAt: Date | null;
  responsibleUser?: { name: string } | null;
  reviewerUser?: { name: string } | null;
};

function getTaskAuditValue(task: TaskAuditSource): AuditSnapshot {
  return {
    title: task.title,
    description: task.description,
    phase: task.phase,
    responsibleUserName: task.responsibleUser?.name ?? null,
    reviewerUserName: task.reviewerUser?.name ?? null,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    approvalRequired: task.approvalRequired,
    isCritical: task.isCritical,
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

const taskUserInclude = {
  responsibleUser: { select: { name: true } },
  reviewerUser: { select: { name: true } },
} as const;

export async function createTaskAction(
  _previousState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const validation = await validateTaskForm(formData);

  if (validation.state) {
    return validation.state;
  }

  const input = validation.input;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_ALL_TASKS)) {
    return {
      values: getTaskFormValues(formData),
      fieldErrors: {},
      formError: "Du hast keine Berechtigung, Aufgaben anzulegen.",
    };
  }

  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });

  if (!event) {
    return {
      values: getTaskFormValues(formData),
      fieldErrors: {},
      formError: "Das zugehörige Event existiert nicht mehr.",
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const task = await transaction.eventTask.create({
        data: {
          eventId: input.eventId,
          title: input.title,
          description: optionalTaskValue(input.description),
          phase: input.phase,
          responsibleUserId: optionalTaskValue(input.responsibleUserId),
          reviewerUserId: optionalTaskValue(input.reviewerUserId),
          status: input.status,
          priority: input.priority,
          dueDate: parseTaskDate(input.dueDate),
          isDueDateManuallyOverridden: Boolean(input.dueDate),
          approvalRequired: input.approvalRequired,
          isCritical: input.isCritical,
          completedAt:
            input.status === TaskStatus.COMPLETED ? new Date() : null,
        },
        include: taskUserInclude,
      });

      await createAuditLog(transaction, {
        userId: currentUser.id,
        entityType: "EventTask",
        entityId: task.id,
        action: AuditAction.TASK_CREATED,
        newValue: getTaskAuditValue(task),
      });

      if (task.status === TaskStatus.COMPLETED) {
        await createAuditLog(transaction, {
          userId: currentUser.id,
          entityType: "EventTask",
          entityId: task.id,
          action: AuditAction.TASK_COMPLETED,
          newValue: {
            status: task.status,
            completedAt: task.completedAt?.toISOString() ?? null,
          },
        });
      }
    });
  } catch (error) {
    console.error("Failed to create task", error);

    return {
      values: getTaskFormValues(formData),
      fieldErrors: {},
      formError:
        "Die Aufgabe konnte nicht gespeichert werden. Bitte versuche es erneut.",
    };
  }

  revalidateTaskViews(input.eventId);
  redirect(`/events/${input.eventId}/tasks`);
}

export async function updateTaskAction(
  _previousState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const validation = await validateTaskForm(formData);

  if (validation.state) {
    return validation.state;
  }

  const input = validation.input;
  const db = getDb();
  const existingTask = await db.eventTask.findFirst({
    where: {
      id: input.taskId,
      eventId: input.eventId,
    },
    include: taskUserInclude,
  });

  if (!existingTask) {
    return {
      values: getTaskFormValues(formData),
      fieldErrors: {},
      formError: "Die Aufgabe existiert nicht mehr.",
    };
  }

  const currentUser = await getCurrentUser();

  if (
    !hasPermission(currentUser, Permission.UPDATE_TASK, {
      responsibleUserId: existingTask.responsibleUserId,
    })
  ) {
    return {
      values: getTaskFormValues(formData),
      fieldErrors: {},
      formError: "Du darfst nur eigene Aufgaben bearbeiten.",
    };
  }

  const canManageAllTasks = hasPermission(
    currentUser,
    Permission.MANAGE_ALL_TASKS,
  );

  if (
    !canManageAllTasks &&
    (optionalTaskValue(input.responsibleUserId) !==
      existingTask.responsibleUserId ||
      optionalTaskValue(input.reviewerUserId) !== existingTask.reviewerUserId ||
      input.approvalRequired !== existingTask.approvalRequired)
  ) {
    return {
      values: getTaskFormValues(formData),
      fieldErrors: {},
      formError:
        "Verantwortlichkeit, Prüfung und Freigaberegel dürfen nur Admins oder Event Leads ändern.",
    };
  }

  const dueDate = parseTaskDate(input.dueDate);
  const dueDateChanged = existingTask.dueDate?.getTime() !== dueDate?.getTime();

  try {
    await db.$transaction(async (transaction) => {
      const updatedTask = await transaction.eventTask.update({
        where: { id: existingTask.id },
        data: {
          title: input.title,
          description: optionalTaskValue(input.description),
          phase: input.phase,
          responsibleUserId: optionalTaskValue(input.responsibleUserId),
          reviewerUserId: optionalTaskValue(input.reviewerUserId),
          status: input.status,
          priority: input.priority,
          dueDate,
          isDueDateManuallyOverridden: dueDateChanged
            ? true
            : existingTask.isDueDateManuallyOverridden,
          approvalRequired: input.approvalRequired,
          isCritical: input.isCritical,
          completedAt:
            input.status === TaskStatus.COMPLETED
              ? (existingTask.completedAt ?? new Date())
              : null,
          ...(existingTask.plannerTaskId
            ? {
                plannerSyncRequired: true,
                plannerSyncStatus: PlannerSyncStatus.PENDING,
              }
            : {}),
        },
        include: taskUserInclude,
      });

      const changes = getChangedAuditValues(
        getTaskAuditValue(existingTask),
        getTaskAuditValue(updatedTask),
      );

      if (changes.hasChanges) {
        await createAuditLog(transaction, {
          userId: currentUser.id,
          entityType: "EventTask",
          entityId: existingTask.id,
          action: AuditAction.TASK_UPDATED,
          oldValue: changes.oldValue,
          newValue: changes.newValue,
        });
      }

      if (existingTask.status !== updatedTask.status) {
        await createAuditLog(transaction, {
          userId: currentUser.id,
          entityType: "EventTask",
          entityId: existingTask.id,
          action: AuditAction.TASK_STATUS_CHANGED,
          oldValue: { status: existingTask.status },
          newValue: { status: updatedTask.status },
        });
      }

      if (dueDateChanged) {
        await createAuditLog(transaction, {
          userId: currentUser.id,
          entityType: "EventTask",
          entityId: existingTask.id,
          action: AuditAction.TASK_DUE_DATE_CHANGED,
          oldValue: {
            dueDate: existingTask.dueDate?.toISOString() ?? null,
          },
          newValue: {
            dueDate: updatedTask.dueDate?.toISOString() ?? null,
            reason: "Manuelle Änderung",
          },
        });
      }

      if (existingTask.responsibleUserId !== updatedTask.responsibleUserId) {
        await createAuditLog(transaction, {
          userId: currentUser.id,
          entityType: "EventTask",
          entityId: existingTask.id,
          action: AuditAction.TASK_RESPONSIBLE_CHANGED,
          oldValue: {
            responsibleUserName: existingTask.responsibleUser?.name ?? null,
          },
          newValue: {
            responsibleUserName: updatedTask.responsibleUser?.name ?? null,
          },
        });
      }

      if (
        existingTask.status !== TaskStatus.COMPLETED &&
        updatedTask.status === TaskStatus.COMPLETED
      ) {
        await createAuditLog(transaction, {
          userId: currentUser.id,
          entityType: "EventTask",
          entityId: existingTask.id,
          action: AuditAction.TASK_COMPLETED,
          oldValue: { status: existingTask.status, completedAt: null },
          newValue: {
            status: updatedTask.status,
            completedAt: updatedTask.completedAt?.toISOString() ?? null,
          },
        });
      }
    });
  } catch (error) {
    console.error("Failed to update task", error);

    return {
      values: getTaskFormValues(formData),
      fieldErrors: {},
      formError:
        "Die Aufgabe konnte nicht gespeichert werden. Bitte versuche es erneut.",
    };
  }

  revalidateTaskViews(input.eventId);
  redirect(`/events/${input.eventId}/tasks`);
}

export async function changeTaskStatusAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const taskId = formData.get("taskId");
  const statusValue = formData.get("status");

  if (
    typeof eventId !== "string" ||
    typeof taskId !== "string" ||
    typeof statusValue !== "string" ||
    !Object.values(TaskStatus).includes(statusValue as TaskStatus)
  ) {
    return;
  }

  const status = statusValue as TaskStatus;
  const db = getDb();
  const task = await db.eventTask.findFirst({
    where: { id: taskId, eventId },
  });

  if (!task || task.status === status) {
    return;
  }

  const currentUser = await getCurrentUser();
  assertPermission(currentUser, Permission.CHANGE_TASK_STATUS, {
    responsibleUserId: task.responsibleUserId,
  });

  await db.$transaction(async (transaction) => {
    const updatedTask = await transaction.eventTask.update({
      where: { id: task.id },
      data: {
        status,
        completedAt:
          status === TaskStatus.COMPLETED
            ? (task.completedAt ?? new Date())
            : null,
        ...(task.plannerTaskId
          ? {
              plannerSyncRequired: true,
              plannerSyncStatus: PlannerSyncStatus.PENDING,
            }
          : {}),
      },
    });

    await createAuditLog(transaction, {
      userId: currentUser.id,
      entityType: "EventTask",
      entityId: task.id,
      action: AuditAction.TASK_STATUS_CHANGED,
      oldValue: { status: task.status },
      newValue: { status },
    });

    if (
      task.status !== TaskStatus.COMPLETED &&
      status === TaskStatus.COMPLETED
    ) {
      await createAuditLog(transaction, {
        userId: currentUser.id,
        entityType: "EventTask",
        entityId: task.id,
        action: AuditAction.TASK_COMPLETED,
        oldValue: { status: task.status, completedAt: null },
        newValue: {
          status,
          completedAt: updatedTask.completedAt?.toISOString() ?? null,
        },
      });
    }
  });

  revalidateTaskViews(eventId);
}

export async function approveTaskAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const taskId = formData.get("taskId");

  if (
    typeof eventId !== "string" ||
    !eventId ||
    typeof taskId !== "string" ||
    !taskId
  ) {
    return;
  }

  const db = getDb();
  const task = await db.eventTask.findFirst({
    where: { id: taskId, eventId },
  });

  if (!task || !task.approvalRequired || task.approvedAt) {
    return;
  }

  const currentUser = await getCurrentUser();
  assertPermission(currentUser, Permission.APPROVE_TASK);

  const approvedAt = new Date();

  await db.$transaction(async (transaction) => {
    await transaction.eventTask.update({
      where: { id: task.id },
      data: {
        approvedById: currentUser.id,
        approvedAt,
        ...(task.plannerTaskId
          ? {
              plannerSyncRequired: true,
              plannerSyncStatus: PlannerSyncStatus.PENDING,
            }
          : {}),
      },
    });

    await createAuditLog(transaction, {
      userId: currentUser.id,
      entityType: "EventTask",
      entityId: task.id,
      action: AuditAction.TASK_APPROVED,
      oldValue: {
        approvedByName: null,
        approvedAt: null,
      },
      newValue: {
        approvedByName: currentUser.name,
        approvedAt: approvedAt.toISOString(),
      },
    });
  });

  revalidateTaskViews(eventId);
}
