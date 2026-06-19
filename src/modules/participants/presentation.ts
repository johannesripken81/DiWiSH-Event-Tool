import type { StatusColor } from "@/components/ui";
import {
  FollowUpStatus,
  ParticipantRating,
  ParticipantStatus,
  ParticipantTargetGroup,
} from "@/generated/prisma/enums";

export const participantTargetGroupOptions = Object.values(
  ParticipantTargetGroup,
);
export const participantStatusOptions = Object.values(ParticipantStatus);
export const participantRatingOptions = Object.values(ParticipantRating);
export const followUpStatusOptions = Object.values(FollowUpStatus);

const targetGroupLabels: Record<ParticipantTargetGroup, string> = {
  COMPANY: "Unternehmen",
  STARTUP: "Startup",
  SME: "Mittelstand",
  UNIVERSITY_RESEARCH: "Hochschule/Forschung",
  PUBLIC_ADMINISTRATION_POLITICS: "Verwaltung/Politik",
  MULTIPLIER: "Multiplikator",
  INVESTOR_FUNDING: "Investor/Förderinstitution",
  TECHNOLOGY_PROVIDER: "Technologieanbieter",
  PROFESSIONAL_TALENT: "Fachkraft/Talent",
  PRESS: "Presse",
  OTHER: "Sonstige",
};

const participantStatusPresentation: Record<
  ParticipantStatus,
  { label: string; color: StatusColor }
> = {
  IDENTIFIED: { label: "Identifiziert", color: "gray" },
  INVITED: { label: "Eingeladen", color: "blue" },
  REGISTERED: { label: "Angemeldet", color: "blue" },
  CONFIRMED: { label: "Bestätigt", color: "green" },
  WAITLIST: { label: "Warteliste", color: "yellow" },
  CANCELLED: { label: "Abgesagt", color: "red" },
};

const ratingPresentation: Record<
  ParticipantRating,
  { label: string; color: StatusColor }
> = {
  LOW: { label: "Niedrig", color: "green" },
  MEDIUM: { label: "Mittel", color: "yellow" },
  HIGH: { label: "Hoch", color: "red" },
};

const matchmakingPresentation: Record<
  ParticipantRating,
  { label: string; color: StatusColor }
> = {
  LOW: { label: "Niedrig", color: "gray" },
  MEDIUM: { label: "Mittel", color: "blue" },
  HIGH: { label: "Hoch", color: "green" },
};

const followUpPresentation: Record<
  FollowUpStatus,
  { label: string; color: StatusColor }
> = {
  NOT_REQUIRED: { label: "Nicht erforderlich", color: "gray" },
  OPEN: { label: "Offen", color: "red" },
  PLANNED: { label: "Geplant", color: "yellow" },
  IN_PROGRESS: { label: "In Bearbeitung", color: "blue" },
  COMPLETED: { label: "Erledigt", color: "green" },
};

export function getParticipantTargetGroupLabel(
  targetGroup: ParticipantTargetGroup,
) {
  return targetGroupLabels[targetGroup];
}

export function getParticipantStatusPresentation(status: ParticipantStatus) {
  return participantStatusPresentation[status];
}

export function getNoShowRiskPresentation(rating: ParticipantRating) {
  return ratingPresentation[rating];
}

export function getMatchmakingPresentation(rating: ParticipantRating) {
  return matchmakingPresentation[rating];
}

export function getFollowUpPresentation(status: FollowUpStatus) {
  return followUpPresentation[status];
}
