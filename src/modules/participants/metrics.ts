import { FollowUpStatus } from "@/generated/prisma/enums";
import { calculateNoShowRate } from "@/modules/evaluations/metrics";

export type ParticipantMetricInput = {
  registered: boolean;
  attended: boolean;
  followUpNeeded: boolean;
  followUpStatus: FollowUpStatus;
};

export function calculateParticipantMetrics(
  participants: ParticipantMetricInput[],
) {
  const registered = participants.filter(
    (participant) => participant.registered,
  ).length;
  const attended = participants.filter(
    (participant) => participant.attended,
  ).length;
  const openFollowUps = participants.filter(
    (participant) =>
      participant.followUpNeeded &&
      participant.followUpStatus !== FollowUpStatus.COMPLETED &&
      participant.followUpStatus !== FollowUpStatus.NOT_REQUIRED,
  ).length;

  return {
    total: participants.length,
    registered,
    attended,
    noShowRate: calculateNoShowRate(registered, attended),
    openFollowUps,
  };
}
