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

const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (!value) {
        return true;
      }

      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, `${label} muss eine gültige HTTP- oder HTTPS-Adresse sein.`);

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const decimalPattern = /^\d{1,9}([.,]\d{1,2})?$/;
const integerPattern = /^\d+$/;

export const eventFormSchema = z
  .object({
    eventId: optionalText("Event-ID", 100),
    title: requiredText("Titel", 200).min(
      3,
      "Titel muss mindestens 3 Zeichen haben.",
    ),
    description: optionalText("Beschreibung", 5000),
    eventDate: z
      .string()
      .trim()
      .regex(datePattern, "Bitte ein gültiges Eventdatum auswählen.")
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), {
        message: "Bitte ein gültiges Eventdatum auswählen.",
      }),
    startTime: z
      .string()
      .trim()
      .refine(
        (value) => !value || timePattern.test(value),
        "Bitte eine gültige Startzeit angeben.",
      ),
    endTime: z
      .string()
      .trim()
      .refine(
        (value) => !value || timePattern.test(value),
        "Bitte eine gültige Endzeit angeben.",
      ),
    location: optionalText("Location", 300),
    format: requiredText("Format", 120),
    goal: optionalText("Ziel", 3000),
    targetAudience: optionalText("Zielgruppe", 3000),
    eventLeadId: requiredText("Event Lead", 100),
    coLeadId: optionalText("Co-Lead", 100),
    communicationOwnerId: optionalText(
      "Kommunikationsverantwortliche Person",
      100,
    ),
    budgetFrame: z
      .string()
      .trim()
      .refine(
        (value) => !value || decimalPattern.test(value),
        "Budgetrahmen muss eine positive Zahl mit höchstens zwei Nachkommastellen sein.",
      )
      .refine(
        (value) => !value || Number(value.replace(",", ".")) > 0,
        "Budgetrahmen muss größer als null sein.",
      ),
    participantGoal: z
      .string()
      .trim()
      .refine(
        (value) => !value || integerPattern.test(value),
        "Teilnehmerziel muss eine positive ganze Zahl sein.",
      )
      .refine(
        (value) => !value || Number(value) <= 100000,
        "Teilnehmerziel darf höchstens 100.000 betragen.",
      )
      .refine(
        (value) => !value || Number(value) > 0,
        "Teilnehmerziel muss größer als null sein.",
      ),
    registrationUrl: optionalUrl("Eventlink"),
    feedbackFormUrl: optionalUrl("Feedbackformular-Link"),
    eventTemplateId: optionalText("Event-Template", 100),
  })
  .superRefine((values, context) => {
    if (
      values.startTime &&
      values.endTime &&
      values.endTime <= values.startTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Endzeit muss nach der Startzeit liegen.",
      });
    }

    if (values.coLeadId && values.coLeadId === values.eventLeadId) {
      context.addIssue({
        code: "custom",
        path: ["coLeadId"],
        message: "Event Lead und Co-Lead müssen verschiedene Personen sein.",
      });
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

export type EventFormState = {
  values: EventFormValues;
  fieldErrors: Partial<Record<keyof EventFormValues, string[]>>;
  formError?: string;
};

export const emptyEventFormValues: EventFormValues = {
  eventId: "",
  title: "",
  description: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  location: "",
  format: "",
  goal: "",
  targetAudience: "",
  eventLeadId: "",
  coLeadId: "",
  communicationOwnerId: "",
  budgetFrame: "",
  participantGoal: "",
  registrationUrl: "",
  feedbackFormUrl: "",
  eventTemplateId: "",
};

export const initialEventFormState: EventFormState = {
  values: emptyEventFormValues,
  fieldErrors: {},
};

export function getEventFormValues(formData: FormData): EventFormValues {
  return Object.fromEntries(
    Object.keys(emptyEventFormValues).map((key) => [
      key,
      typeof formData.get(key) === "string" ? formData.get(key) : "",
    ]),
  ) as EventFormValues;
}

export function parseEventDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function parseEventTime(value: string) {
  return value ? new Date(`1970-01-01T${value}:00.000Z`) : null;
}

export function formatEventFormDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function formatEventFormTime(value: Date | null) {
  return value ? value.toISOString().slice(11, 16) : "";
}

export function optionalValue(value: string) {
  return value || null;
}
