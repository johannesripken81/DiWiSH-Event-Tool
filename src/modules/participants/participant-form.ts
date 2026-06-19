import { z } from "zod";

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
  email: z
    .string()
    .trim()
    .min(1, "E-Mail ist erforderlich.")
    .email("Bitte gib eine gültige E-Mail-Adresse ein.")
    .max(320, "E-Mail darf höchstens 320 Zeichen haben."),
  organization: optionalText("Organisation", 300),
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
    email: "",
    organization: "",
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
    email: getString(formData, "email"),
    organization: getString(formData, "organization"),
  };
}

export function optionalParticipantValue(value: string) {
  const normalized = value.trim();
  return normalized || null;
}
