import { Prisma } from "@/generated/prisma/client";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export const participantListPageSize = 50;

type ParticipantMetricsRow = {
  attended: number;
  followUps: number;
  registered: number;
  total: number;
};

export async function getParticipantList(eventId: string, page = 1) {
  await requireEventReadAccess();
  const db = getDb();
  const requestedPage = Math.max(1, page);
  const [event, metricsRows] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    }),
    db.$queryRaw<ParticipantMetricsRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "registered" = true)::int AS "registered",
        COUNT(*) FILTER (WHERE "attended" = true)::int AS "attended",
        COUNT(*) FILTER (WHERE "followUpNeeded" = true)::int AS "followUps"
      FROM "EventParticipant"
      WHERE "eventId" = ${eventId}
    `),
  ]);
  const metrics = metricsRows[0] ?? {
    attended: 0,
    followUps: 0,
    registered: 0,
    total: 0,
  };
  const total = metrics.total;
  const totalPages = Math.max(1, Math.ceil(total / participantListPageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const participants = await db.eventParticipant.findMany({
    where: { eventId },
    select: {
      id: true,
      name: true,
      organization: true,
      role: true,
      email: true,
      targetGroupType: true,
      status: true,
      personallyInvited: true,
      registered: true,
      attended: true,
      noShowRisk: true,
      matchmakingPotential: true,
      followUpNeeded: true,
      followUpStatus: true,
    },
    orderBy: [{ name: "asc" }, { organization: "asc" }],
    skip: (currentPage - 1) * participantListPageSize,
    take: participantListPageSize,
  });

  return {
    event,
    participants,
    metrics: {
      total,
      registered: metrics.registered,
      attended: metrics.attended,
      followUps: metrics.followUps,
    },
    pagination: {
      currentPage: Math.min(currentPage, totalPages),
      pageSize: participantListPageSize,
      totalItems: total,
      totalPages,
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
