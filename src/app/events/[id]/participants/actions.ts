"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { FollowUpStatus, ParticipantStatus } from "@/generated/prisma/enums";
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
  maxParticipantCsvFileSizeBytes,
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
    role: optionalParticipantValue(input.role),
    email: input.email.toLowerCase(),
    targetGroupType: input.targetGroupType,
    status: input.status,
    personallyInvited: input.personallyInvited,
    registered: input.registered,
    attended: input.attended,
    noShowRisk: input.noShowRisk,
    interestTopic: optionalParticipantValue(input.interestTopic),
    matchmakingPotential: input.matchmakingPotential,
    followUpNeeded: input.followUpNeeded,
    followUpStatus: input.followUpStatus,
  };
}

function getParticipantAuditValue(
  participant: ReturnType<typeof getParticipantData>,
) {
  return {
    name: participant.name,
    email: participant.email,
    organization: participant.organization,
    role: participant.role,
    status: participant.status,
    targetGroupType: participant.targetGroupType,
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
          userId: currentUser.id,
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
          userId: currentUser.id,
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

  if (csvFile.size > maxParticipantCsvFileSizeBytes) {
    redirect(`/events/${eventId}/participants?import=file-too-large`);
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
  let skipped = parsed.skipped;
  const rowsByEmail = new Map<string, (typeof parsed.rows)[number]>();

  for (const row of parsed.rows) {
    if (rowsByEmail.has(row.email)) {
      skipped += 1;
    }

    rowsByEmail.set(row.email, row);
  }

  const rows = [...rowsByEmail.values()];
  const existingParticipants = await db.eventParticipant.findMany({
    where: {
      eventId,
      email: { in: rows.map((row) => row.email) },
    },
    select: { id: true, email: true },
  });
  const existingByEmail = new Map(
    existingParticipants.map((participant) => [participant.email, participant]),
  );
  const rowsToCreate = rows.filter((row) => !existingByEmail.has(row.email));
  const rowsToUpdate = rows.filter((row) => existingByEmail.has(row.email));

  await db.$transaction(async (transaction) => {
    if (rowsToCreate.length > 0) {
      const result = await transaction.eventParticipant.createMany({
        data: rowsToCreate.map((row) => ({
          eventId,
          name: row.name,
          email: row.email,
          organization: row.organization,
        })),
        skipDuplicates: true,
      });
      created = result.count;
    }

    for (const row of rowsToUpdate) {
      const existing = existingByEmail.get(row.email);

      if (!existing) {
        continue;
      }

      await transaction.eventParticipant.update({
        where: { id: existing.id },
        data: {
          name: row.name,
          organization: row.organization,
        },
      });
      updated += 1;
    }

    await transaction.auditLog.create({
      data: {
        userId: currentUser.id,
        entityType: "Event",
        entityId: eventId,
        action: "PARTICIPANTS_IMPORTED",
        newValue: {
          created,
          updated,
          skipped,
        },
      },
    });
  });

  revalidateParticipantViews(eventId);
  redirect(
    `/events/${eventId}/participants?imported=${created}&updated=${updated}&skipped=${skipped}`,
  );
}

export async function updateParticipantQuickAction(formData: FormData) {
  const eventId = formData.get("eventId");
  const participantId = formData.get("participantId");
  const action = formData.get("action");

  if (
    typeof eventId !== "string" ||
    !eventId ||
    typeof participantId !== "string" ||
    !participantId ||
    typeof action !== "string"
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
    select: {
      id: true,
      name: true,
      status: true,
      registered: true,
      attended: true,
      followUpNeeded: true,
      followUpStatus: true,
    },
  });

  if (!participant) {
    return;
  }

  const data: {
    status?: ParticipantStatus;
    registered?: boolean;
    attended?: boolean;
    followUpNeeded?: boolean;
    followUpStatus?: FollowUpStatus;
  } = {};

  if (action === "markRegistered") {
    data.registered = true;
    if (
      participant.status === ParticipantStatus.IDENTIFIED ||
      participant.status === ParticipantStatus.INVITED
    ) {
      data.status = ParticipantStatus.REGISTERED;
    }
  } else if (action === "markAttended") {
    data.registered = true;
    data.attended = true;
    if (participant.status !== ParticipantStatus.CANCELLED) {
      data.status = ParticipantStatus.CONFIRMED;
    }
  } else if (action === "markFollowUpNeeded") {
    data.followUpNeeded = true;
    if (participant.followUpStatus === FollowUpStatus.NOT_REQUIRED) {
      data.followUpStatus = FollowUpStatus.OPEN;
    }
  } else if (action === "clearFollowUp") {
    data.followUpNeeded = false;
    data.followUpStatus = FollowUpStatus.NOT_REQUIRED;
  } else {
    return;
  }

  const newValue = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

  await db.$transaction([
    db.eventParticipant.update({
      where: { id: participant.id },
      data,
    }),
    db.auditLog.create({
      data: {
        userId: currentUser.id,
        entityType: "EventParticipant",
        entityId: participant.id,
        action: "QUICK_UPDATED",
        oldValue: {
          status: participant.status,
          registered: participant.registered,
          attended: participant.attended,
          followUpNeeded: participant.followUpNeeded,
          followUpStatus: participant.followUpStatus,
        },
        newValue,
      },
    }),
  ]);

  revalidateParticipantViews(eventId);
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
        userId: currentUser.id,
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
