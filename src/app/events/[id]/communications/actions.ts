"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { assertPermission, hasPermission, Permission } from "@/lib/permissions";
import {
  communicationFormSchema,
  getCommunicationFormValues,
  optionalCommunicationValue,
  parseCommunicationDate,
  type CommunicationFormState,
} from "@/modules/communications/communication-form";

function revalidateCommunicationViews(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/communications`);
}

async function validateCommunicationForm(formData: FormData): Promise<
  | { state: CommunicationFormState; input?: never }
  | {
      state?: never;
      input: ReturnType<typeof communicationFormSchema.parse>;
    }
> {
  const values = getCommunicationFormValues(formData);
  const result = communicationFormSchema.safeParse(values);

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
    const responsibleUser = await db.user.findUnique({
      where: { id: result.data.responsibleUserId },
      select: { id: true },
    });

    if (!responsibleUser) {
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

function getMeasureData(
  input: ReturnType<typeof communicationFormSchema.parse>,
) {
  return {
    channel: input.channel,
    targetAudience: input.targetAudience,
    message: input.message,
    format: input.format,
    responsibleUserId: optionalCommunicationValue(input.responsibleUserId),
    publicationDate: parseCommunicationDate(input.publicationDate),
    approvalStatus: input.approvalStatus,
    assetUrl: optionalCommunicationValue(input.assetUrl),
    clicks: Number(input.clicks),
    registrations: Number(input.registrations),
    reach: Number(input.reach),
    comments: optionalCommunicationValue(input.comments),
  };
}

export async function createCommunicationMeasureAction(
  _previousState: CommunicationFormState,
  formData: FormData,
): Promise<CommunicationFormState> {
  const values = getCommunicationFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_COMMUNICATION)) {
    return {
      values,
      fieldErrors: {},
      formError:
        "Du hast keine Berechtigung, den Kommunikationsplan zu bearbeiten.",
    };
  }

  const validation = await validateCommunicationForm(formData);

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
      values: getCommunicationFormValues(formData),
      fieldErrors: {},
      formError: "Das zugehörige Event existiert nicht mehr.",
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const measure = await transaction.communicationMeasure.create({
        data: {
          eventId: input.eventId,
          ...getMeasureData(input),
        },
      });

      await transaction.auditLog.create({
        data: {
          entityType: "CommunicationMeasure",
          entityId: measure.id,
          action: "CREATED",
          newValue: {
            channel: measure.channel,
            targetAudience: measure.targetAudience,
            publicationDate: measure.publicationDate.toISOString(),
            approvalStatus: measure.approvalStatus,
          },
        },
      });
    });
  } catch (error) {
    console.error("Failed to create communication measure", error);

    return {
      values: getCommunicationFormValues(formData),
      fieldErrors: {},
      formError: "Die Kommunikationsmaßnahme konnte nicht gespeichert werden.",
    };
  }

  revalidateCommunicationViews(input.eventId);
  redirect(`/events/${input.eventId}/communications`);
}

export async function updateCommunicationMeasureAction(
  _previousState: CommunicationFormState,
  formData: FormData,
): Promise<CommunicationFormState> {
  const values = getCommunicationFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_COMMUNICATION)) {
    return {
      values,
      fieldErrors: {},
      formError:
        "Du hast keine Berechtigung, den Kommunikationsplan zu bearbeiten.",
    };
  }

  const validation = await validateCommunicationForm(formData);

  if (validation.state) {
    return validation.state;
  }

  const input = validation.input;
  const db = getDb();
  const existingMeasure = await db.communicationMeasure.findFirst({
    where: {
      id: input.measureId,
      eventId: input.eventId,
    },
  });

  if (!existingMeasure) {
    return {
      values: getCommunicationFormValues(formData),
      fieldErrors: {},
      formError: "Die Kommunikationsmaßnahme existiert nicht mehr.",
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const measure = await transaction.communicationMeasure.update({
        where: { id: existingMeasure.id },
        data: getMeasureData(input),
      });

      await transaction.auditLog.create({
        data: {
          entityType: "CommunicationMeasure",
          entityId: measure.id,
          action: "UPDATED",
          oldValue: {
            channel: existingMeasure.channel,
            targetAudience: existingMeasure.targetAudience,
            publicationDate: existingMeasure.publicationDate.toISOString(),
            approvalStatus: existingMeasure.approvalStatus,
          },
          newValue: {
            channel: measure.channel,
            targetAudience: measure.targetAudience,
            publicationDate: measure.publicationDate.toISOString(),
            approvalStatus: measure.approvalStatus,
          },
        },
      });
    });
  } catch (error) {
    console.error("Failed to update communication measure", error);

    return {
      values: getCommunicationFormValues(formData),
      fieldErrors: {},
      formError: "Die Kommunikationsmaßnahme konnte nicht gespeichert werden.",
    };
  }

  revalidateCommunicationViews(input.eventId);
  redirect(`/events/${input.eventId}/communications`);
}

export async function deleteCommunicationMeasureAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const measureId = formData.get("measureId");

  if (
    typeof eventId !== "string" ||
    !eventId ||
    typeof measureId !== "string" ||
    !measureId
  ) {
    return;
  }

  const currentUser = await getCurrentUser();
  assertPermission(currentUser, Permission.MANAGE_COMMUNICATION);

  const db = getDb();
  const measure = await db.communicationMeasure.findFirst({
    where: {
      id: measureId,
      eventId,
    },
  });

  if (!measure) {
    return;
  }

  await db.$transaction([
    db.auditLog.create({
      data: {
        entityType: "CommunicationMeasure",
        entityId: measure.id,
        action: "DELETED",
        oldValue: {
          channel: measure.channel,
          targetAudience: measure.targetAudience,
          publicationDate: measure.publicationDate.toISOString(),
          approvalStatus: measure.approvalStatus,
        },
      },
    }),
    db.communicationMeasure.delete({
      where: { id: measure.id },
    }),
  ]);

  revalidateCommunicationViews(eventId);
  redirect(`/events/${eventId}/communications`);
}
