import {
  FollowUpStatus,
  ParticipantStatus,
  ParticipantTargetGroup,
  Prisma,
} from "@/generated/prisma/client";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { calculateParticipantMetrics } from "@/modules/participants/metrics";

export type ParticipantFollowUpFilter =
  | "all"
  | "open"
  | "completed"
  | "not-required";

export type ParticipantFilters = {
  targetGroupType?: ParticipantTargetGroup;
  status?: ParticipantStatus;
  followUp: ParticipantFollowUpFilter;
};

function getFollowUpWhere(
  filter: ParticipantFollowUpFilter,
): Prisma.EventParticipantWhereInput | undefined {
  switch (filter) {
    case "open":
      return {
        followUpNeeded: true,
        followUpStatus: {
          notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.NOT_REQUIRED],
        },
      };
    case "completed":
      return {
        followUpNeeded: true,
        followUpStatus: FollowUpStatus.COMPLETED,
      };
    case "not-required":
      return {
        followUpNeeded: false,
      };
    case "all":
      return undefined;
  }
}

export async function getParticipantList(
  eventId: string,
  filters: ParticipantFilters,
) {
  await requireEventReadAccess();
  const db = getDb();
  const where: Prisma.EventParticipantWhereInput = {
    eventId,
    targetGroupType: filters.targetGroupType,
    status: filters.status,
    ...getFollowUpWhere(filters.followUp),
  };

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      eventDate: true,
    },
  });
  const participants = await db.eventParticipant.findMany({
    where,
    orderBy: [{ name: "asc" }, { organization: "asc" }],
  });
  const metricParticipants = await db.eventParticipant.findMany({
    where: { eventId },
    select: {
      registered: true,
      attended: true,
      followUpNeeded: true,
      followUpStatus: true,
    },
  });

  return {
    event,
    participants,
    metrics: calculateParticipantMetrics(metricParticipants),
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

export function isParticipantTargetGroup(
  value: string | undefined,
): value is ParticipantTargetGroup {
  return value
    ? Object.values(ParticipantTargetGroup).includes(
        value as ParticipantTargetGroup,
      )
    : false;
}

export function isParticipantStatus(
  value: string | undefined,
): value is ParticipantStatus {
  return value
    ? Object.values(ParticipantStatus).includes(value as ParticipantStatus)
    : false;
}

export function isParticipantFollowUpFilter(
  value: string | undefined,
): value is ParticipantFollowUpFilter {
  return (
    value === "all" ||
    value === "open" ||
    value === "completed" ||
    value === "not-required"
  );
}
