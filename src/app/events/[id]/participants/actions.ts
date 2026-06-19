"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { assertPermission, hasPermission, Permission } from "@/lib/permissions";
import {
  combineParticipantName,
  getParticipantFormValues,
  optionalParticipantValue,
  participantFormSchema,
  type ParticipantFormState,
} from "@/modules/participants/participant-form";
import {
  mapParticipantCsvRows,
  type ParticipantCsvMapping,
} from "@/modules/participants/csv-import";

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
  return {
    name: combineParticipantName(input.firstName, input.lastName),
    organization: optionalParticipantValue(input.organization),
    email: input.email.toLowerCase(),
  };
}

function getParticipantAuditValue(
  participant: ReturnType<typeof getParticipantData>,
) {
  return {
    name: participant.name,
    email: participant.email,
    organization: participant.organization,
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
            organization: existingParticipant.organization,
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

export async function importParticipantsCsvAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const csvFile = formData.get("csvFile");
  const mapping: ParticipantCsvMapping = {
    firstName: String(formData.get("firstNameColumn") ?? ""),
    lastName: String(formData.get("lastNameColumn") ?? ""),
    email: String(formData.get("emailColumn") ?? ""),
    organization: String(formData.get("organizationColumn") ?? ""),
  };

  if (typeof eventId !== "string" || !eventId) {
    redirect("/events");
  }

  const currentUser = await getCurrentUser();
  assertPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS);

  if (!(csvFile instanceof File) || csvFile.size === 0) {
    redirect(`/events/${eventId}/participants?import=missing-file`);
  }

  const text = await csvFile.text();
  const parsed = mapParticipantCsvRows(text, mapping);

  if (parsed.rows.length === 0) {
    redirect(`/events/${eventId}/participants?import=empty`);
  }

  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  if (!event) {
    redirect("/events");
  }

  let created = 0;
  let updated = 0;

  for (const row of parsed.rows) {
    const existing = await db.eventParticipant.findUnique({
      where: {
        eventId_email: {
          eventId,
          email: row.email,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await db.eventParticipant.update({
        where: { id: existing.id },
        data: {
          name: row.name,
          organization: row.organization,
        },
      });
      updated += 1;
    } else {
      await db.eventParticipant.create({
        data: {
          eventId,
          name: row.name,
          email: row.email,
          organization: row.organization,
        },
      });
      created += 1;
    }
  }

  revalidateParticipantViews(eventId);
  redirect(
    `/events/${eventId}/participants?imported=${created}&updated=${updated}&skipped=${parsed.skipped}`,
  );
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
          organization: participant.organization,
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
