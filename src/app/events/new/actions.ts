"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { EventStatus, Prisma, type Event } from "@/generated/prisma/client";
import {
  AuditAction,
  createAuditLog,
  getChangedAuditValues,
  type AuditSnapshot,
} from "@/lib/audit-log";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  eventFormSchema,
  getEventFormValues,
  optionalValue,
  parseEventDate,
  parseEventTime,
  type EventFormState,
} from "@/modules/events/create-event";
import { createEventTasksFromTemplate } from "@/modules/events/template-tasks";

function getUserFieldErrors(
  userIds: Set<string>,
  values: ReturnType<typeof getEventFormValues>,
) {
  const fieldErrors: EventFormState["fieldErrors"] = {};

  if (!userIds.has(values.eventLeadId)) {
    fieldErrors.eventLeadId = ["Der ausgewählte Event Lead existiert nicht."];
  }

  if (values.coLeadId && !userIds.has(values.coLeadId)) {
    fieldErrors.coLeadId = ["Der ausgewählte Co-Lead existiert nicht."];
  }

  if (
    values.communicationOwnerId &&
    !userIds.has(values.communicationOwnerId)
  ) {
    fieldErrors.communicationOwnerId = [
      "Die ausgewählte Kommunikationsperson existiert nicht.",
    ];
  }

  return fieldErrors;
}

const eventUserInclude = {
  eventLead: { select: { name: true } },
  coLead: { select: { name: true } },
  communicationOwner: { select: { name: true } },
} as const;

type EventAuditSource = Event & {
  eventLead: { name: string } | null;
  coLead: { name: string } | null;
  communicationOwner: { name: string } | null;
};

function getEventAuditValue(event: EventAuditSource): AuditSnapshot {
  return {
    title: event.title,
    description: event.description,
    eventDate: event.eventDate.toISOString(),
    startTime: event.startTime?.toISOString() ?? null,
    endTime: event.endTime?.toISOString() ?? null,
    location: event.location,
    format: event.format,
    goal: event.goal,
    targetAudience: event.targetAudience,
    eventLeadName: event.eventLead?.name ?? null,
    coLeadName: event.coLead?.name ?? null,
    communicationOwnerName: event.communicationOwner?.name ?? null,
    budgetFrame: event.budgetFrame?.toString() ?? null,
    participantGoal: event.participantGoal,
    registrationUrl: event.registrationUrl,
    feedbackFormUrl: event.feedbackFormUrl,
  };
}

function getEventData(input: ReturnType<typeof eventFormSchema.parse>) {
  return {
    title: input.title,
    description: optionalValue(input.description),
    eventDate: parseEventDate(input.eventDate),
    startTime: parseEventTime(input.startTime),
    endTime: parseEventTime(input.endTime),
    location: optionalValue(input.location),
    format: input.format,
    goal: optionalValue(input.goal),
    targetAudience: optionalValue(input.targetAudience),
    eventLeadId: input.eventLeadId,
    coLeadId: optionalValue(input.coLeadId),
    communicationOwnerId: optionalValue(input.communicationOwnerId),
    budgetFrame: input.budgetFrame
      ? new Prisma.Decimal(input.budgetFrame.replace(",", "."))
      : null,
    participantGoal: input.participantGoal
      ? Number(input.participantGoal)
      : null,
    registrationUrl: optionalValue(input.registrationUrl),
    feedbackFormUrl: optionalValue(input.feedbackFormUrl),
  };
}

export async function createEventAction(
  _previousState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const values = getEventFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENTS)) {
    return {
      values,
      fieldErrors: {},
      formError: "Du hast keine Berechtigung, Events anzulegen.",
    };
  }

  const result = eventFormSchema.safeParse(values);

  if (!result.success) {
    return {
      values,
      fieldErrors: result.error.flatten().fieldErrors,
      formError: "Bitte prüfe die markierten Eingaben.",
    };
  }

  const input = result.data;
  const db = getDb();
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
    },
  });
  const userErrors = getUserFieldErrors(
    new Set(users.map((user) => user.id)),
    input,
  );

  if (Object.keys(userErrors).length > 0) {
    return {
      values,
      fieldErrors: userErrors,
      formError: "Mindestens eine ausgewählte Person ist nicht verfügbar.",
    };
  }

  const template = input.eventTemplateId
    ? await db.eventTemplate.findUnique({
        where: { id: input.eventTemplateId },
        include: {
          taskTemplates: {
            orderBy: [{ offsetDays: "asc" }, { title: "asc" }],
          },
        },
      })
    : null;

  if (input.eventTemplateId && !template) {
    return {
      values,
      fieldErrors: {
        eventTemplateId: [
          "Das ausgewählte Event-Template existiert nicht mehr.",
        ],
      },
      formError: "Bitte wähle ein verfügbares Event-Template.",
    };
  }

  const eventData = getEventData(input);
  const eventDate = eventData.eventDate;
  const eventLeadId = input.eventLeadId;
  const coLeadId = optionalValue(input.coLeadId);
  const communicationOwnerId = optionalValue(input.communicationOwnerId);
  const usersById = new Map(users.map((user) => [user.id, user]));

  let eventId: string;

  try {
    const event = await db.$transaction(
      async (transaction) => {
        const createdEvent = await transaction.event.create({
          data: {
            ...eventData,
            status: EventStatus.DRAFT,
          },
          include: eventUserInclude,
        });

        if (template && template.taskTemplates.length > 0) {
          const tasks = await transaction.eventTask.createManyAndReturn({
            data: createEventTasksFromTemplate(template.taskTemplates, {
              eventId: createdEvent.id,
              eventDate,
              eventLeadId,
              coLeadId,
              communicationOwnerId,
              users,
            }),
          });

          await transaction.auditLog.createMany({
            data: tasks.map((task) => {
              const responsibleUser = task.responsibleUserId
                ? usersById.get(task.responsibleUserId)
                : null;
              const reviewerUser = task.reviewerUserId
                ? usersById.get(task.reviewerUserId)
                : null;

              return {
                userId: currentUser.id,
                entityType: "EventTask",
                entityId: task.id,
                action: AuditAction.TASK_CREATED,
                newValue: {
                  title: task.title,
                  description: task.description,
                  phase: task.phase,
                  responsibleUserName: responsibleUser?.name ?? null,
                  reviewerUserName: reviewerUser?.name ?? null,
                  status: task.status,
                  priority: task.priority,
                  dueDate: task.dueDate?.toISOString() ?? null,
                  approvalRequired: task.approvalRequired,
                  isCritical: task.isCritical,
                  completedAt: null,
                },
              };
            }),
          });
        }

        await createAuditLog(transaction, {
          userId: currentUser.id,
          entityType: "Event",
          entityId: createdEvent.id,
          action: AuditAction.EVENT_CREATED,
          newValue: getEventAuditValue(createdEvent),
        });

        return createdEvent;
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
    eventId = event.id;
  } catch (error) {
    console.error("Failed to create event", error);

    return {
      values,
      fieldErrors: {},
      formError:
        "Das Event konnte nicht gespeichert werden. Bitte versuche es erneut.",
    };
  }

  revalidatePath("/events");
  redirect(`/events/${eventId}`);
}

export async function updateEventAction(
  _previousState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const values = getEventFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENTS)) {
    return {
      values,
      fieldErrors: {},
      formError: "Du hast keine Berechtigung, Events zu bearbeiten.",
    };
  }

  const result = eventFormSchema.safeParse(values);

  if (!result.success) {
    return {
      values,
      fieldErrors: result.error.flatten().fieldErrors,
      formError: "Bitte prüfe die markierten Eingaben.",
    };
  }

  const input = result.data;

  if (!input.eventId) {
    return {
      values,
      fieldErrors: {},
      formError: "Das zu bearbeitende Event fehlt.",
    };
  }

  const db = getDb();
  const existingEvent = await db.event.findUnique({
    where: { id: input.eventId },
    include: eventUserInclude,
  });
  const users = await db.user.findMany({
    select: { id: true },
  });

  if (!existingEvent) {
    return {
      values,
      fieldErrors: {},
      formError: "Das Event existiert nicht mehr.",
    };
  }

  const userErrors = getUserFieldErrors(
    new Set(users.map((user) => user.id)),
    input,
  );

  if (Object.keys(userErrors).length > 0) {
    return {
      values,
      fieldErrors: userErrors,
      formError: "Mindestens eine ausgewählte Person ist nicht verfügbar.",
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const updatedEvent = await transaction.event.update({
        where: { id: existingEvent.id },
        data: getEventData(input),
        include: eventUserInclude,
      });
      const changes = getChangedAuditValues(
        getEventAuditValue(existingEvent),
        getEventAuditValue(updatedEvent),
      );

      if (changes.hasChanges) {
        await createAuditLog(transaction, {
          userId: currentUser.id,
          entityType: "Event",
          entityId: existingEvent.id,
          action: AuditAction.EVENT_UPDATED,
          oldValue: changes.oldValue,
          newValue: changes.newValue,
        });
      }
    });
  } catch (error) {
    console.error("Failed to update event", error);

    return {
      values,
      fieldErrors: {},
      formError:
        "Das Event konnte nicht gespeichert werden. Bitte versuche es erneut.",
    };
  }

  revalidatePath("/events");
  revalidatePath(`/events/${input.eventId}`);
  redirect(`/events/${input.eventId}`);
}

export async function deleteEventAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const confirmationTitle = formData.get("confirmationTitle");
  const currentUser = await getCurrentUser();

  if (typeof eventId !== "string" || !eventId) {
    redirect("/events?delete=invalid");
  }

  if (!hasPermission(currentUser, Permission.MANAGE_EVENTS)) {
    redirect(`/events/${eventId}/edit?delete=denied`);
  }

  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: eventUserInclude,
  });

  if (!event) {
    redirect("/events?delete=not-found");
  }

  if (
    typeof confirmationTitle !== "string" ||
    confirmationTitle.trim() !== event.title
  ) {
    redirect(`/events/${event.id}/edit?delete=confirm`);
  }

  try {
    await db.$transaction(async (transaction) => {
      await createAuditLog(transaction, {
        userId: currentUser.id,
        entityType: "Event",
        entityId: event.id,
        action: AuditAction.EVENT_DELETED,
        oldValue: getEventAuditValue(event),
      });

      await transaction.event.delete({
        where: { id: event.id },
      });
    });
  } catch (error) {
    console.error("Failed to delete event", error);
    redirect(`/events/${event.id}/edit?delete=failed`);
  }

  revalidatePath("/");
  revalidatePath("/events");
  redirect("/events?deleted=1");
}
