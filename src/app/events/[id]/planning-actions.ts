"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PlannerSyncStatus, Prisma } from "@/generated/prisma/client";
import { AuditAction, createAuditLog } from "@/lib/audit-log";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { assertPermission, hasPermission, Permission } from "@/lib/permissions";
import { createTaskTemplatesFromEventTasks } from "@/modules/events/template-tasks";
import { planTaskDueDate } from "@/modules/tasks/reverse-planning";

function revalidateEventViews(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/tasks`);
  revalidatePath("/events");
  revalidatePath("/tasks");
}

function getTemplateText(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function redirectTemplateResult(
  eventId: string,
  params: Record<string, string>,
): never {
  const query = new URLSearchParams(params);
  redirect(`/events/${eventId}?${query.toString()}`);
}

export async function createEventTemplateFromEventAction(formData: FormData) {
  const eventId = getTemplateText(formData, "eventId", 100);
  const name = getTemplateText(formData, "name", 120);
  const description = getTemplateText(formData, "description", 1000);

  if (!eventId) {
    return;
  }

  if (!name) {
    redirectTemplateResult(eventId, { template: "invalid" });
  }

  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENTS)) {
    redirectTemplateResult(eventId, { template: "denied" });
  }

  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      eventDate: true,
      tasks: {
        select: {
          title: true,
          description: true,
          phase: true,
          responsibleUser: { select: { role: true } },
          reviewerUser: { select: { role: true } },
          priority: true,
          dueDate: true,
          offsetDays: true,
          approvalRequired: true,
          isCritical: true,
        },
        orderBy: [{ dueDate: "asc" }, { title: "asc" }],
      },
    },
  });

  if (!event) {
    return;
  }

  if (event.tasks.length === 0) {
    redirectTemplateResult(event.id, { template: "empty" });
  }

  const taskTemplates = createTaskTemplatesFromEventTasks(
    event.tasks,
    event.eventDate,
  );
  let templateId: string | undefined;

  try {
    const template = await db.$transaction(async (transaction) => {
      const createdTemplate = await transaction.eventTemplate.create({
        data: {
          name,
          description: description || null,
        },
      });

      await transaction.taskTemplate.createMany({
        data: taskTemplates.map((taskTemplate) => ({
          ...taskTemplate,
          eventTemplateId: createdTemplate.id,
        })),
      });

      return createdTemplate;
    });

    templateId = template.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectTemplateResult(event.id, { template: "duplicate" });
    }

    console.error("Failed to create event template from event", error);
    redirectTemplateResult(event.id, { template: "failed" });
  }

  if (!templateId) {
    redirectTemplateResult(event.id, { template: "failed" });
  }

  revalidatePath("/settings");
  revalidatePath(`/settings/event-templates/${templateId}`);
  revalidateEventViews(event.id);
  redirectTemplateResult(event.id, {
    template: "saved",
    templateId,
    taskCount: String(taskTemplates.length),
  });
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
              ? "RÃ¼ckwÃ¤rtsplanung mit bestÃ¤tigtem Ãœberschreiben"
              : "RÃ¼ckwÃ¤rtsplanung",
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
