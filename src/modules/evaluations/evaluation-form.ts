import { z } from "zod";

const optionalInteger = (label: string, minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^-?\d+$/.test(value) &&
          Number(value) >= minimum &&
          Number(value) <= maximum),
      `${label} muss zwischen ${minimum} und ${maximum} liegen.`,
    );

const optionalDecimal = (label: string, minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= minimum &&
          Number(value) <= maximum),
      `${label} muss zwischen ${minimum} und ${maximum} liegen.`,
    );

const optionalText = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `${label} darf höchstens ${maxLength} Zeichen haben.`);

export const evaluationFormSchema = z
  .object({
    eventId: z.string().trim().min(1, "Event ist erforderlich.").max(100),
    registrations: optionalInteger("Anzahl Anmeldungen", 0, 1_000_000),
    attendees: optionalInteger("Anzahl Teilnehmende", 0, 1_000_000),
    targetAudienceFit: optionalInteger("Zielgruppenfit", 1, 5),
    satisfaction: optionalDecimal("Zufriedenheit", 1, 5),
    netPromoterScore: optionalInteger("Net Promoter Score", -100, 100),
    newContacts: optionalInteger("Neue Kontakte", 0, 1_000_000),
    cooperationApproaches: optionalInteger("Kooperationsansätze", 0, 1_000_000),
    followUpConversations: optionalInteger("Folgegespräche", 0, 1_000_000),
    qualitativeLearnings: optionalText("Qualitative Learnings", 10_000),
    wentWell: optionalText("Was lief gut?", 10_000),
    wasDifficult: optionalText("Was war schwierig?", 10_000),
    nextTimeDifferent: optionalText(
      "Was machen wir beim nächsten Mal anders?",
      10_000,
    ),
    repeatEvent: z.enum(["", "yes", "no"]),
  })
  .superRefine((value, context) => {
    if (
      value.registrations !== "" &&
      value.attendees !== "" &&
      Number(value.attendees) > Number(value.registrations)
    ) {
      context.addIssue({
        code: "custom",
        path: ["attendees"],
        message:
          "Die Zahl der Teilnehmenden darf die Anmeldungen nicht überschreiten.",
      });
    }
  });

export type EvaluationFormValues = z.infer<typeof evaluationFormSchema>;

export type EvaluationFormState = {
  values: EvaluationFormValues;
  fieldErrors: Partial<Record<keyof EvaluationFormValues, string[]>>;
  formError?: string;
};

export function getEmptyEvaluationFormValues(
  eventId: string,
): EvaluationFormValues {
  return {
    eventId,
    registrations: "",
    attendees: "",
    targetAudienceFit: "",
    satisfaction: "",
    netPromoterScore: "",
    newContacts: "",
    cooperationApproaches: "",
    followUpConversations: "",
    qualitativeLearnings: "",
    wentWell: "",
    wasDifficult: "",
    nextTimeDifferent: "",
    repeatEvent: "",
  };
}

function getString(formData: FormData, name: keyof EvaluationFormValues) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function getEvaluationFormValues(
  formData: FormData,
): EvaluationFormValues {
  return {
    eventId: getString(formData, "eventId"),
    registrations: getString(formData, "registrations"),
    attendees: getString(formData, "attendees"),
    targetAudienceFit: getString(formData, "targetAudienceFit"),
    satisfaction: getString(formData, "satisfaction"),
    netPromoterScore: getString(formData, "netPromoterScore"),
    newContacts: getString(formData, "newContacts"),
    cooperationApproaches: getString(formData, "cooperationApproaches"),
    followUpConversations: getString(formData, "followUpConversations"),
    qualitativeLearnings: getString(formData, "qualitativeLearnings"),
    wentWell: getString(formData, "wentWell"),
    wasDifficult: getString(formData, "wasDifficult"),
    nextTimeDifferent: getString(formData, "nextTimeDifferent"),
    repeatEvent: getString(formData, "repeatEvent") as "" | "yes" | "no",
  };
}

export function optionalEvaluationNumber(value: string) {
  return value === "" ? null : Number(value);
}

export function optionalEvaluationText(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

export function parseRepeatEvent(value: "" | "yes" | "no") {
  if (value === "") {
    return null;
  }

  return value === "yes";
}
