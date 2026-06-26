import {
  FollowUpStatus,
  ParticipantRating,
  ParticipantStatus,
  ParticipantTargetGroup,
} from "@/generated/prisma/enums";
import type { StatusColor } from "@/components/ui";

export const participantTargetGroupOptions = Object.values(
  ParticipantTargetGroup,
);
export const participantStatusOptions = Object.values(ParticipantStatus);
export const participantRatingOptions = Object.values(ParticipantRating);
export const followUpStatusOptions = Object.values(FollowUpStatus);

export const participantTargetGroupLabels: Record<
  ParticipantTargetGroup,
  string
> = {
  COMPANY: "Unternehmen",
  STARTUP: "Startup",
  SME: "KMU",
  UNIVERSITY_RESEARCH: "Hochschule/Forschung",
  PUBLIC_ADMINISTRATION_POLITICS: "Verwaltung/Politik",
  MULTIPLIER: "Multiplikator",
  INVESTOR_FUNDING: "Investor/Förderung",
  TECHNOLOGY_PROVIDER: "Technologieanbieter",
  PROFESSIONAL_TALENT: "Fachkraft/Talent",
  PRESS: "Presse",
  OTHER: "Sonstige",
};

export const participantStatusLabels: Record<ParticipantStatus, string> = {
  IDENTIFIED: "Identifiziert",
  INVITED: "Eingeladen",
  REGISTERED: "Registriert",
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Abgesagt",
};

export const participantRatingLabels: Record<ParticipantRating, string> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
};

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  NOT_REQUIRED: "Nicht nötig",
  OPEN: "Offen",
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  COMPLETED: "Erledigt",
};

export function getParticipantStatusColor(
  status: ParticipantStatus,
): StatusColor {
  switch (status) {
    case ParticipantStatus.CONFIRMED:
    case ParticipantStatus.REGISTERED:
      return "green";
    case ParticipantStatus.WAITLIST:
      return "yellow";
    case ParticipantStatus.CANCELLED:
      return "gray";
    case ParticipantStatus.INVITED:
      return "blue";
    case ParticipantStatus.IDENTIFIED:
      return "gray";
  }
}

export function getFollowUpStatusColor(status: FollowUpStatus): StatusColor {
  switch (status) {
    case FollowUpStatus.COMPLETED:
      return "green";
    case FollowUpStatus.IN_PROGRESS:
    case FollowUpStatus.PLANNED:
      return "blue";
    case FollowUpStatus.OPEN:
      return "yellow";
    case FollowUpStatus.NOT_REQUIRED:
      return "gray";
  }
}
