import { z } from "zod";

import {
  FollowUpStatus,
  ParticipantRating,
  ParticipantStatus,
  ParticipantTargetGroup,
} from "@/generated/prisma/enums";

const requiredText = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} ist erforderlich.`)
    .max(maxLength, `${label} darf höchstens ${maxLength} Zeichen haben.`);

const optionalText = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `${label} darf höchstens ${maxLength} Zeichen haben.`);

export const participantFormSchema = z.object({
  eventId: requiredText("Event", 100),
  participantId: optionalText("Teilnehmende Person", 100),
  firstName: requiredText("Vorname", 150),
  lastName: requiredText("Nachname", 150),
  role: optionalText("Rolle/Funktion", 200),
  email: z
    .string()
    .trim()
    .min(1, "E-Mail ist erforderlich.")
    .email("Bitte gib eine gültige E-Mail-Adresse ein.")
    .max(320, "E-Mail darf höchstens 320 Zeichen haben."),
  organization: optionalText("Organisation", 300),
  targetGroupType: z.enum(ParticipantTargetGroup, {
    error: "Bitte wähle eine Zielgruppe.",
  }),
  status: z.enum(ParticipantStatus, {
    error: "Bitte wähle einen Status.",
  }),
  personallyInvited: z.boolean(),
  registered: z.boolean(),
  attended: z.boolean(),
  noShowRisk: z.enum(ParticipantRating, {
    error: "Bitte wähle ein No-Show-Risiko.",
  }),
  interestTopic: optionalText("Interessengebiet", 500),
  matchmakingPotential: z.enum(ParticipantRating, {
    error: "Bitte wähle ein Matchmaking-Potenzial.",
  }),
  followUpNeeded: z.boolean(),
  followUpStatus: z.enum(FollowUpStatus, {
    error: "Bitte wähle einen Follow-up-Status.",
  }),
});

export type ParticipantFormValues = z.infer<typeof participantFormSchema>;

export type ParticipantFormState = {
  values: ParticipantFormValues;
  fieldErrors: Partial<Record<keyof ParticipantFormValues, string[]>>;
  formError?: string;
};

export function splitParticipantName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function combineParticipantName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function getEmptyParticipantFormValues(
  eventId: string,
): ParticipantFormValues {
  return {
    eventId,
    participantId: "",
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    organization: "",
    targetGroupType: ParticipantTargetGroup.OTHER,
    status: ParticipantStatus.IDENTIFIED,
    personallyInvited: false,
    registered: false,
    attended: false,
    noShowRisk: ParticipantRating.MEDIUM,
    interestTopic: "",
    matchmakingPotential: ParticipantRating.MEDIUM,
    followUpNeeded: false,
    followUpStatus: FollowUpStatus.NOT_REQUIRED,
  };
}

function getString(formData: FormData, name: keyof ParticipantFormValues) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function getParticipantFormValues(
  formData: FormData,
): ParticipantFormValues {
  return {
    eventId: getString(formData, "eventId"),
    participantId: getString(formData, "participantId"),
    firstName: getString(formData, "firstName"),
    lastName: getString(formData, "lastName"),
    role: getString(formData, "role"),
    email: getString(formData, "email"),
    organization: getString(formData, "organization"),
    targetGroupType: getString(
      formData,
      "targetGroupType",
    ) as ParticipantTargetGroup,
    status: getString(formData, "status") as ParticipantStatus,
    personallyInvited: formData.get("personallyInvited") === "on",
    registered: formData.get("registered") === "on",
    attended: formData.get("attended") === "on",
    noShowRisk: getString(formData, "noShowRisk") as ParticipantRating,
    interestTopic: getString(formData, "interestTopic"),
    matchmakingPotential: getString(
      formData,
      "matchmakingPotential",
    ) as ParticipantRating,
    followUpNeeded: formData.get("followUpNeeded") === "on",
    followUpStatus: getString(formData, "followUpStatus") as FollowUpStatus,
  };
}

export function optionalParticipantValue(value: string) {
  const normalized = value.trim();
  return normalized || null;
}
