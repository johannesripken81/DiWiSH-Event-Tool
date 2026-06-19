import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

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

export const runOfShowFormSchema = z
  .object({
    eventId: requiredText("Event", 100),
    itemId: optionalText("Programmpunkt", 100),
    startTime: z
      .string()
      .trim()
      .regex(timePattern, "Bitte gib eine gültige Startzeit an."),
    endTime: z
      .string()
      .trim()
      .regex(timePattern, "Bitte gib eine gültige Endzeit an."),
    programItem: requiredText("Programmpunkt", 300),
    goal: optionalText("Ziel", 3000),
    method: optionalText("Methode", 2000),
    responsibleUserId: optionalText("Verantwortliche Person", 100),
    material: optionalText("Material", 3000),
    risk: optionalText("Risiko", 3000),
    transitionNote: optionalText("Übergang/Moderationshinweis", 5000),
  })
  .superRefine((value, context) => {
    if (
      timePattern.test(value.startTime) &&
      timePattern.test(value.endTime) &&
      value.endTime <= value.startTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Die Endzeit muss nach der Startzeit liegen.",
      });
    }
  });

export type RunOfShowFormValues = z.infer<typeof runOfShowFormSchema>;

export type RunOfShowFormState = {
  values: RunOfShowFormValues;
  fieldErrors: Partial<Record<keyof RunOfShowFormValues, string[]>>;
  formError?: string;
};

export function getEmptyRunOfShowFormValues(
  eventId: string,
): RunOfShowFormValues {
  return {
    eventId,
    itemId: "",
    startTime: "",
    endTime: "",
    programItem: "",
    goal: "",
    method: "",
    responsibleUserId: "",
    material: "",
    risk: "",
    transitionNote: "",
  };
}

function getString(formData: FormData, name: keyof RunOfShowFormValues) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function getRunOfShowFormValues(
  formData: FormData,
): RunOfShowFormValues {
  return {
    eventId: getString(formData, "eventId"),
    itemId: getString(formData, "itemId"),
    startTime: getString(formData, "startTime"),
    endTime: getString(formData, "endTime"),
    programItem: getString(formData, "programItem"),
    goal: getString(formData, "goal"),
    method: getString(formData, "method"),
    responsibleUserId: getString(formData, "responsibleUserId"),
    material: getString(formData, "material"),
    risk: getString(formData, "risk"),
    transitionNote: getString(formData, "transitionNote"),
  };
}

export function parseRunOfShowTime(value: string) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export function formatRunOfShowFormTime(value: Date) {
  return value.toISOString().slice(11, 16);
}

export function optionalRunOfShowValue(value: string) {
  const normalized = value.trim();
  return normalized || null;
}
