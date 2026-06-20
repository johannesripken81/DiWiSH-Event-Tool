import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export async function getParticipantList(eventId: string) {
  await requireEventReadAccess();
  const db = getDb();
  const [event, participants] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    }),
    db.eventParticipant.findMany({
      where: { eventId },
      orderBy: [{ name: "asc" }, { organization: "asc" }],
    }),
  ]);

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
  const [event, participant] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
      },
    }),
    participantId
      ? db.eventParticipant.findFirst({
          where: {
            id: participantId,
            eventId,
          },
        })
      : Promise.resolve(null),
  ]);

  return { event, participant };
}
