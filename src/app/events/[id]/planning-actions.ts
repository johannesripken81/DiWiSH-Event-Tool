"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlannerSyncStatus } from "@/generated/prisma/client";
import { AuditAction, createAuditLog } from "@/lib/audit-log";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { assertPermission, Permission } from "@/lib/permissions";
import { planTaskDueDate } from "@/modules/tasks/reverse-planning";

function revalidateEventViews(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/tasks`);
  revalidatePath("/events");
  revalidatePath("/tasks");
}

export async function recalculateTaskDueDatesAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const overwriteManualOverrides =
    formData.get("overwriteManualOverrides") === "on";

  if (typeof eventId !== "string" || !eventId) {
    return;
  }

  const currentUser = await getCurrentUser();
  assertPermission(currentUser, Permission.MANAGE_EVENTS);

  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      eventDate: true,
      tasks: {
        select: {
          id: true,
          dueDate: true,
          offsetDays: true,
          isDueDateManuallyOverridden: true,
          plannerTaskId: true,
        },
      },
    },
  });

  if (!event) {
    return;
  }

  const plans = event.tasks.map((task) => ({
    task,
    plan: planTaskDueDate(task, event.eventDate, overwriteManualOverrides),
  }));
  const updates = plans.filter(({ plan }) => plan.shouldUpdate);
  const skippedManualOverrides = plans.filter(
    ({ plan }) => plan.reason === "manual_override",
  ).length;
  const tasksWithoutOffset = plans.filter(
    ({ plan }) => plan.reason === "missing_offset",
  ).length;

  if (updates.length > 0) {
    await db.$transaction(async (transaction) => {
      for (const { task, plan } of updates) {
        if (!plan.shouldUpdate) {
          continue;
        }

        await transaction.eventTask.update({
          where: { id: task.id },
          data: {
            dueDate: plan.dueDate,
            isDueDateManuallyOverridden: false,
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
          action: AuditAction.TASK_DUE_DATE_CHANGED,
          oldValue: {
            dueDate: task.dueDate?.toISOString() ?? null,
          },
          newValue: {
            dueDate: plan.dueDate.toISOString(),
            reason: overwriteManualOverrides
              ? "Rückwärtsplanung mit bestätigtem Überschreiben"
              : "Rückwärtsplanung",
          },
        });
      }
    });
  }

  revalidateEventViews(eventId);

  const result = new URLSearchParams({
    planning: "recalculated",
    updated: String(updates.length),
    skipped: String(skippedManualOverrides),
    withoutOffset: String(tasksWithoutOffset),
  });
  redirect(`/events/${eventId}?${result.toString()}`);
}
