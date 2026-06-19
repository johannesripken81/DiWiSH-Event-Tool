import { CommunicationApprovalStatus } from "@/generated/prisma/enums";

type PublicationMeasure = {
  publicationDate: Date;
  approvalStatus: CommunicationApprovalStatus;
};

export function getTodayUtc() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function isCommunicationMeasureOverdue(
  measure: PublicationMeasure,
  today = getTodayUtc(),
) {
  return (
    measure.publicationDate < today &&
    measure.approvalStatus !== CommunicationApprovalStatus.APPROVED
  );
}
