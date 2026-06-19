"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { FollowUpStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { assertPermission, hasPermission, Permission } from "@/lib/permissions";
import {
  checkboxToBoolean,
  getParticipantFormValues,
  optionalParticipantValue,
  participantFormSchema,
  type ParticipantFormState,
} from "@/modules/participants/participant-form";

function revalidateParticipantViews(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/participants`);
}

async function validateParticipantForm(formData: FormData): Promise<
  | { state: ParticipantFormState; input?: never }
  | {
      state?: never;
      input: ReturnType<typeof participantFormSchema.parse>;
    }
> {
  const values = getParticipantFormValues(formData);
  const result = participantFormSchema.safeParse(values);

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
  const duplicate = await db.eventParticipant.findFirst({
    where: {
      eventId: result.data.eventId,
      email: {
        equals: result.data.email.toLowerCase(),
        mode: "insensitive",
      },
      id: result.data.participantId
        ? { not: result.data.participantId }
        : undefined,
    },
    select: { id: true },
  });

  if (duplicate) {
    return {
      state: {
        values,
        fieldErrors: {
          email: [
            "Für dieses Event existiert bereits eine Person mit dieser E-Mail-Adresse.",
          ],
        },
        formError: "Die Person ist bereits in der Teilnehmerliste vorhanden.",
      },
    };
  }

  return { input: result.data };
}

function getParticipantData(
  input: ReturnType<typeof participantFormSchema.parse>,
) {
  const followUpNeeded = checkboxToBoolean(input.followUpNeeded);

  return {
    name: input.name,
    organization: optionalParticipantValue(input.organization),
    role: optionalParticipantValue(input.role),
    email: input.email.toLowerCase(),
    targetGroupType: input.targetGroupType,
    status: input.status,
    personallyInvited: checkboxToBoolean(input.personallyInvited),
    registered: checkboxToBoolean(input.registered),
    attended: checkboxToBoolean(input.attended),
    noShowRisk: input.noShowRisk,
    interestTopic: optionalParticipantValue(input.interestTopic),
    matchmakingPotential: input.matchmakingPotential,
    followUpNeeded,
    followUpStatus: followUpNeeded
      ? input.followUpStatus
      : FollowUpStatus.NOT_REQUIRED,
  };
}

function getParticipantAuditValue(
  participant: ReturnType<typeof getParticipantData>,
) {
  return {
    name: participant.name,
    email: participant.email,
    targetGroupType: participant.targetGroupType,
    status: participant.status,
    registered: participant.registered,
    attended: participant.attended,
    followUpNeeded: participant.followUpNeeded,
    followUpStatus: participant.followUpStatus,
  };
}

export async function createParticipantAction(
  _previousState: ParticipantFormState,
  formData: FormData,
): Promise<ParticipantFormState> {
  const values = getParticipantFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    return {
      values,
      fieldErrors: {},
      formError:
        "Du hast keine Berechtigung, die Teilnehmerliste zu bearbeiten.",
    };
  }

  const validation = await validateParticipantForm(formData);

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
      values: getParticipantFormValues(formData),
      fieldErrors: {},
      formError: "Das zugehörige Event existiert nicht mehr.",
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const participantData = getParticipantData(input);
      const participant = await transaction.eventParticipant.create({
        data: {
          eventId: input.eventId,
          ...participantData,
        },
      });

      await transaction.auditLog.create({
        data: {
          entityType: "EventParticipant",
          entityId: participant.id,
          action: "CREATED",
          newValue: getParticipantAuditValue(participantData),
        },
      });
    });
  } catch (error) {
    console.error("Failed to create event participant", error);

    return {
      values: getParticipantFormValues(formData),
      fieldErrors: {},
      formError: "Die teilnehmende Person konnte nicht gespeichert werden.",
    };
  }

  revalidateParticipantViews(input.eventId);
  redirect(`/events/${input.eventId}/participants`);
}

export async function updateParticipantAction(
  _previousState: ParticipantFormState,
  formData: FormData,
): Promise<ParticipantFormState> {
  const values = getParticipantFormValues(formData);
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    return {
      values,
      fieldErrors: {},
      formError:
        "Du hast keine Berechtigung, die Teilnehmerliste zu bearbeiten.",
    };
  }

  const validation = await validateParticipantForm(formData);

  if (validation.state) {
    return validation.state;
  }

  const input = validation.input;
  const db = getDb();
  const existingParticipant = await db.eventParticipant.findFirst({
    where: {
      id: input.participantId,
      eventId: input.eventId,
    },
  });

  if (!existingParticipant) {
    return {
      values: getParticipantFormValues(formData),
      fieldErrors: {},
      formError: "Die teilnehmende Person existiert nicht mehr.",
    };
  }

  try {
    await db.$transaction(async (transaction) => {
      const participantData = getParticipantData(input);
      const participant = await transaction.eventParticipant.update({
        where: { id: existingParticipant.id },
        data: participantData,
      });

      await transaction.auditLog.create({
        data: {
          entityType: "EventParticipant",
          entityId: participant.id,
          action: "UPDATED",
          oldValue: {
            name: existingParticipant.name,
            email: existingParticipant.email,
            targetGroupType: existingParticipant.targetGroupType,
            status: existingParticipant.status,
            registered: existingParticipant.registered,
            attended: existingParticipant.attended,
            followUpNeeded: existingParticipant.followUpNeeded,
            followUpStatus: existingParticipant.followUpStatus,
          },
          newValue: getParticipantAuditValue(participantData),
        },
      });
    });
  } catch (error) {
    console.error("Failed to update event participant", error);

    return {
      values: getParticipantFormValues(formData),
      fieldErrors: {},
      formError: "Die teilnehmende Person konnte nicht gespeichert werden.",
    };
  }

  revalidateParticipantViews(input.eventId);
  redirect(`/events/${input.eventId}/participants`);
}

export async function deleteParticipantAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const participantId = formData.get("participantId");

  if (
    typeof eventId !== "string" ||
    !eventId ||
    typeof participantId !== "string" ||
    !participantId
  ) {
    return;
  }

  const currentUser = await getCurrentUser();
  assertPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS);

  const db = getDb();
  const participant = await db.eventParticipant.findFirst({
    where: {
      id: participantId,
      eventId,
    },
  });

  if (!participant) {
    return;
  }

  await db.$transaction([
    db.auditLog.create({
      data: {
        entityType: "EventParticipant",
        entityId: participant.id,
        action: "DELETED",
        oldValue: {
          name: participant.name,
          email: participant.email,
          targetGroupType: participant.targetGroupType,
          status: participant.status,
          registered: participant.registered,
          attended: participant.attended,
          followUpNeeded: participant.followUpNeeded,
          followUpStatus: participant.followUpStatus,
        },
      },
    }),
    db.eventParticipant.delete({
      where: { id: participant.id },
    }),
  ]);

  revalidateParticipantViews(eventId);
  redirect(`/events/${eventId}/participants`);
}
