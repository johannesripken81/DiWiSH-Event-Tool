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

const checkboxValue = z.enum(["", "on"]);

export const participantFormSchema = z
  .object({
    eventId: requiredText("Event", 100),
    participantId: optionalText("Teilnehmende Person", 100),
    name: requiredText("Name", 300),
    organization: optionalText("Organisation", 300),
    role: optionalText("Rolle", 300),
    email: z
      .string()
      .trim()
      .min(1, "E-Mail ist erforderlich.")
      .email("Bitte gib eine gültige E-Mail-Adresse ein.")
      .max(320, "E-Mail darf höchstens 320 Zeichen haben."),
    targetGroupType: z.enum(ParticipantTargetGroup),
    status: z.enum(ParticipantStatus),
    personallyInvited: checkboxValue,
    registered: checkboxValue,
    attended: checkboxValue,
    noShowRisk: z.enum(ParticipantRating),
    interestTopic: optionalText("Interesse/Thema", 5000),
    matchmakingPotential: z.enum(ParticipantRating),
    followUpNeeded: checkboxValue,
    followUpStatus: z.enum(FollowUpStatus),
  })
  .superRefine((value, context) => {
    if (value.attended === "on" && value.registered !== "on") {
      context.addIssue({
        code: "custom",
        path: ["attended"],
        message:
          "Eine teilgenommene Person muss zugleich als angemeldet markiert sein.",
      });
    }

    if (
      value.followUpNeeded === "on" &&
      value.followUpStatus === FollowUpStatus.NOT_REQUIRED
    ) {
      context.addIssue({
        code: "custom",
        path: ["followUpStatus"],
        message:
          "Bitte wähle für ein erforderliches Follow-up einen offenen Status.",
      });
    }
  });

export type ParticipantFormValues = z.infer<typeof participantFormSchema>;

export type ParticipantFormState = {
  values: ParticipantFormValues;
  fieldErrors: Partial<Record<keyof ParticipantFormValues, string[]>>;
  formError?: string;
};

export function getEmptyParticipantFormValues(
  eventId: string,
): ParticipantFormValues {
  return {
    eventId,
    participantId: "",
    name: "",
    organization: "",
    role: "",
    email: "",
    targetGroupType: ParticipantTargetGroup.OTHER,
    status: ParticipantStatus.IDENTIFIED,
    personallyInvited: "",
    registered: "",
    attended: "",
    noShowRisk: ParticipantRating.MEDIUM,
    interestTopic: "",
    matchmakingPotential: ParticipantRating.MEDIUM,
    followUpNeeded: "",
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
    name: getString(formData, "name"),
    organization: getString(formData, "organization"),
    role: getString(formData, "role"),
    email: getString(formData, "email"),
    targetGroupType: getString(
      formData,
      "targetGroupType",
    ) as ParticipantTargetGroup,
    status: getString(formData, "status") as ParticipantStatus,
    personallyInvited: getString(formData, "personallyInvited") as "" | "on",
    registered: getString(formData, "registered") as "" | "on",
    attended: getString(formData, "attended") as "" | "on",
    noShowRisk: getString(formData, "noShowRisk") as ParticipantRating,
    interestTopic: getString(formData, "interestTopic"),
    matchmakingPotential: getString(
      formData,
      "matchmakingPotential",
    ) as ParticipantRating,
    followUpNeeded: getString(formData, "followUpNeeded") as "" | "on",
    followUpStatus: getString(formData, "followUpStatus") as FollowUpStatus,
  };
}

export function optionalParticipantValue(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

export function checkboxToBoolean(value: "" | "on") {
  return value === "on";
}
