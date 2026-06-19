import {
  CommunicationApprovalStatus,
  CommunicationChannel,
} from "@/generated/prisma/enums";
import type { StatusColor } from "@/components/ui";

export const communicationChannelOptions = [
  CommunicationChannel.WEBSITE,
  CommunicationChannel.NEWSLETTER,
  CommunicationChannel.LINKEDIN,
  CommunicationChannel.PARTNER_COMMUNICATION,
  CommunicationChannel.PERSONAL_INVITATION,
  CommunicationChannel.REMINDER_EMAIL,
  CommunicationChannel.PRESS,
  CommunicationChannel.POST_EVENT_REPORT,
] as const;

export const communicationApprovalStatusOptions = [
  CommunicationApprovalStatus.DRAFT,
  CommunicationApprovalStatus.IN_REVIEW,
  CommunicationApprovalStatus.APPROVED,
  CommunicationApprovalStatus.REJECTED,
] as const;

const channelLabels: Record<CommunicationChannel, string> = {
  WEBSITE: "Website",
  NEWSLETTER: "Newsletter",
  LINKEDIN: "LinkedIn",
  PARTNER_COMMUNICATION: "Partnerkommunikation",
  PERSONAL_INVITATION: "Persönliche Einladung",
  REMINDER_EMAIL: "Reminder-Mail",
  PRESS: "Presse",
  POST_EVENT_REPORT: "Nachbericht",
};

const approvalStatusPresentation: Record<
  CommunicationApprovalStatus,
  { label: string; color: StatusColor }
> = {
  DRAFT: { label: "Entwurf", color: "gray" },
  IN_REVIEW: { label: "In Prüfung", color: "yellow" },
  APPROVED: { label: "Freigegeben", color: "green" },
  REJECTED: { label: "Abgelehnt", color: "red" },
};

export function getCommunicationChannelLabel(channel: CommunicationChannel) {
  return channelLabels[channel];
}

export function getCommunicationApprovalPresentation(
  status: CommunicationApprovalStatus,
) {
  return approvalStatusPresentation[status];
}

export function getSafeAssetUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
