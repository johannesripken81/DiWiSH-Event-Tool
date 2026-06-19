import {
  CommunicationApprovalStatus,
  CommunicationChannel,
  Prisma,
} from "@/generated/prisma/client";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";

export type CommunicationFilters = {
  channel?: CommunicationChannel;
  approvalStatus?: CommunicationApprovalStatus;
};

export async function getCommunicationPlan(
  eventId: string,
  filters: CommunicationFilters,
) {
  await requireEventReadAccess();
  const db = getDb();
  const where: Prisma.CommunicationMeasureWhereInput = {
    eventId,
    channel: filters.channel,
    approvalStatus: filters.approvalStatus,
  };

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      eventDate: true,
    },
  });
  const measures = await db.communicationMeasure.findMany({
    where,
    include: {
      responsibleUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ publicationDate: "asc" }, { createdAt: "asc" }],
  });
  const totalMeasures = await db.communicationMeasure.count({
    where: { eventId },
  });

  return { event, measures, totalMeasures };
}

export async function getCommunicationEditorData(
  eventId: string,
  measureId?: string,
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
  const measure = measureId
    ? await db.communicationMeasure.findFirst({
        where: {
          id: measureId,
          eventId,
        },
      })
    : null;
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return { event, measure, users };
}

export function isCommunicationChannel(
  value: string | undefined,
): value is CommunicationChannel {
  return value
    ? Object.values(CommunicationChannel).includes(
        value as CommunicationChannel,
      )
    : false;
}

export function isCommunicationApprovalStatus(
  value: string | undefined,
): value is CommunicationApprovalStatus {
  return value
    ? Object.values(CommunicationApprovalStatus).includes(
        value as CommunicationApprovalStatus,
      )
    : false;
}
