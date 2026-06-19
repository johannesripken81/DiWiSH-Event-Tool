import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function getParticipantList(eventId: string) {
  await requireEventReadAccess();
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      eventDate: true,
    },
  });
  const participants = await db.eventParticipant.findMany({
    where: { eventId },
    orderBy: [{ name: "asc" }, { organization: "asc" }],
  });

  return {
    event,
    participants,
    metrics: {
      total: participants.length,
    },
  };
}

export async function getParticipantEditorData(
  eventId: string,
  participantId?: string,
) {
  await requireEventReadAccess();
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
    },
  });
  const participant = participantId
    ? await db.eventParticipant.findFirst({
        where: {
          id: participantId,
          eventId,
        },
      })
    : null;

  return { event, participant };
}
