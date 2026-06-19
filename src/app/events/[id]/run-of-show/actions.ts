"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { assertPermission, hasPermission, Permission } from "@/lib/permissions";
import {
  getRunOfShowFormValues,
  optionalRunOfShowValue,
  parseRunOfShowTime,
  runOfShowFormSchema,
  type RunOfShowFormState,
} from "@/modules/run-of-show/run-of-show-form";

function revalidateRunOfShowViews(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/run-of-show`);
  revalidatePath(`/events/${eventId}/run-of-show/event-day`);
}

async function validateRunOfShowForm(formData: FormData): Promise<
  | { state: RunOfShowFormState; input?: never }
  | {
      state?: never;
      input: ReturnType<typeof runOfShowFormSchema.parse>;
    }
> {
  const values = getRunOfShowFormValues(formData);
  const result = runOfShowFormSchema.safeParse(values);

  if (!result.success) {
    return {
      state: {
        values,
        fieldErrors: result.error.flatten().fieldErrors,
        formError: "Bitte prüfe die markierten Eingaben.",
      },
    };
  }

  if (result.data.responsibleUserId) {
    const db = getDb();
    const user = await db.user.findUnique({
      where: { id: result.data.responsibleUserId },
      select: { id: true },
    });

    if (!user) {
      return {
        state: {
          values,
          fieldErrors: {
            responsibleUserId: [
              "Die ausgewählte verantwortliche Person existiert nicht.",
            ],
          },
          formError: "Die ausgewählte Person ist nicht verfügbar.",
        },
      };
    }
  }

  return { input: result.data };
}

function getRunOfShowItemData(
  input: ReturnType<typeof runOfShowFormSchema.parse>,
) {
  return {
    startTime: parseRunOfShowTime(input.startTime),
    endTime: parseRunOfShowTime(input.endTime),
    programItem: input.programItem,
    goal: optionalRunOfShowValue(input.goal),
    method: optionalRunOfShowValue(input.method),
    responsibleUserId: optionalRunOfShowValue(input.responsibleUserId),
    material: optionalRunOfShowValue(input.material),
    risk: optionalRunOfShowValue(input.risk),
    transitionNote: optionalRunOfShowValue(input.transitionNote),
  };
}

export async function createRunOfShowItemAction(
  _previousState: RunOfShowFormState,
  formData: FormData,
): Promise<RunOfShowFormState> {
  const values = getRunOfShowFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    return {
      values,
      fieldErrors: {},
      formError: "Du hast keine Berechtigung, den Regieplan zu bearbeiten.",
    };
  }

  const validation = await validateRunOfShowForm(formData);

  if (validation.state) {
    return validation.state;
  }

  const input = validation.input;
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });

  if (!event) {
    return {
      values: getRunOfShowFormValues(formData),
      fieldErrors: {},
      formError: "Das zugehörige Event existiert nicht mehr.",
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const item = await transaction.runOfShowItem.create({
        data: {
          eventId: input.eventId,
          ...getRunOfShowItemData(input),
        },
      });

      await transaction.auditLog.create({
        data: {
          entityType: "RunOfShowItem",
          entityId: item.id,
          action: "CREATED",
          newValue: {
            startTime: item.startTime.toISOString(),
            endTime: item.endTime.toISOString(),
            programItem: item.programItem,
            responsibleUserId: item.responsibleUserId,
          },
        },
      });
    });
  } catch (error) {
    console.error("Failed to create run of show item", error);

    return {
      values: getRunOfShowFormValues(formData),
      fieldErrors: {},
      formError: "Der Programmpunkt konnte nicht gespeichert werden.",
    };
  }

  revalidateRunOfShowViews(input.eventId);
  redirect(`/events/${input.eventId}/run-of-show`);
}

export async function updateRunOfShowItemAction(
  _previousState: RunOfShowFormState,
  formData: FormData,
): Promise<RunOfShowFormState> {
  const values = getRunOfShowFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    return {
      values,
      fieldErrors: {},
      formError: "Du hast keine Berechtigung, den Regieplan zu bearbeiten.",
    };
  }

  const validation = await validateRunOfShowForm(formData);

  if (validation.state) {
    return validation.state;
  }

  const input = validation.input;
  const db = getDb();
  const existingItem = await db.runOfShowItem.findFirst({
    where: {
      id: input.itemId,
      eventId: input.eventId,
    },
  });

  if (!existingItem) {
    return {
      values: getRunOfShowFormValues(formData),
      fieldErrors: {},
      formError: "Der Programmpunkt existiert nicht mehr.",
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const item = await transaction.runOfShowItem.update({
        where: { id: existingItem.id },
        data: getRunOfShowItemData(input),
      });

      await transaction.auditLog.create({
        data: {
          entityType: "RunOfShowItem",
          entityId: item.id,
          action: "UPDATED",
          oldValue: {
            startTime: existingItem.startTime.toISOString(),
            endTime: existingItem.endTime.toISOString(),
            programItem: existingItem.programItem,
            responsibleUserId: existingItem.responsibleUserId,
          },
          newValue: {
            startTime: item.startTime.toISOString(),
            endTime: item.endTime.toISOString(),
            programItem: item.programItem,
            responsibleUserId: item.responsibleUserId,
          },
        },
      });
    });
  } catch (error) {
    console.error("Failed to update run of show item", error);

    return {
      values: getRunOfShowFormValues(formData),
      fieldErrors: {},
      formError: "Der Programmpunkt konnte nicht gespeichert werden.",
    };
  }

  revalidateRunOfShowViews(input.eventId);
  redirect(`/events/${input.eventId}/run-of-show`);
}

export async function deleteRunOfShowItemAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const itemId = formData.get("itemId");

  if (
    typeof eventId !== "string" ||
    !eventId ||
    typeof itemId !== "string" ||
    !itemId
  ) {
    return;
  }

  const currentUser = await getCurrentUser();
  assertPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS);

  const db = getDb();
  const item = await db.runOfShowItem.findFirst({
    where: {
      id: itemId,
      eventId,
    },
  });

  if (!item) {
    return;
  }

  await db.$transaction([
    db.auditLog.create({
      data: {
        entityType: "RunOfShowItem",
        entityId: item.id,
        action: "DELETED",
        oldValue: {
          startTime: item.startTime.toISOString(),
          endTime: item.endTime.toISOString(),
          programItem: item.programItem,
          responsibleUserId: item.responsibleUserId,
        },
      },
    }),
    db.runOfShowItem.delete({
      where: { id: item.id },
    }),
  ]);

  revalidateRunOfShowViews(eventId);
  redirect(`/events/${eventId}/run-of-show`);
}
