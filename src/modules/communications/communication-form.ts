import { z } from "zod";

import {
  CommunicationApprovalStatus,
  CommunicationChannel,
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

const metricValue = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => /^\d+$/.test(value),
      `${label} muss eine nichtnegative ganze Zahl sein.`,
    )
    .refine(
      (value) => Number(value) <= 1_000_000_000,
      `${label} darf höchstens 1.000.000.000 betragen.`,
    );

export const communicationFormSchema = z
  .object({
    eventId: requiredText("Event", 100),
    measureId: optionalText("Maßnahme", 100),
    channel: z.enum(CommunicationChannel, {
      error: "Bitte wähle einen Kanal.",
    }),
    targetAudience: requiredText("Zielgruppe", 1000),
    message: requiredText("Botschaft", 5000),
    format: requiredText("Format", 200),
    responsibleUserId: optionalText("Verantwortliche Person", 100),
    publicationDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte gib ein gültiges Datum an."),
    approvalStatus: z.enum(CommunicationApprovalStatus, {
      error: "Bitte wähle einen Freigabestatus.",
    }),
    assetUrl: z
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
      }, "Der Asset-Link muss eine gültige HTTP- oder HTTPS-Adresse sein."),
    clicks: metricValue("Klicks"),
    registrations: metricValue("Anmeldungen"),
    reach: metricValue("Reichweite"),
    comments: optionalText("Kommentare", 5000),
  })
  .superRefine((value, context) => {
    const publicationDate = new Date(`${value.publicationDate}T00:00:00.000Z`);

    if (
      Number.isNaN(publicationDate.getTime()) ||
      publicationDate.toISOString().slice(0, 10) !== value.publicationDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["publicationDate"],
        message: "Bitte gib ein gültiges Datum an.",
      });
    }
  });

export type CommunicationFormValues = z.infer<typeof communicationFormSchema>;

export type CommunicationFormState = {
  values: CommunicationFormValues;
  fieldErrors: Partial<Record<keyof CommunicationFormValues, string[]>>;
  formError?: string;
};

export function getEmptyCommunicationFormValues(
  eventId: string,
): CommunicationFormValues {
  return {
    eventId,
    measureId: "",
    channel: CommunicationChannel.WEBSITE,
    targetAudience: "",
    message: "",
    format: "",
    responsibleUserId: "",
    publicationDate: "",
    approvalStatus: CommunicationApprovalStatus.DRAFT,
    assetUrl: "",
    clicks: "0",
    registrations: "0",
    reach: "0",
    comments: "",
  };
}

function getString(formData: FormData, name: keyof CommunicationFormValues) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function getCommunicationFormValues(
  formData: FormData,
): CommunicationFormValues {
  return {
    eventId: getString(formData, "eventId"),
    measureId: getString(formData, "measureId"),
    channel: getString(formData, "channel") as CommunicationChannel,
    targetAudience: getString(formData, "targetAudience"),
    message: getString(formData, "message"),
    format: getString(formData, "format"),
    responsibleUserId: getString(formData, "responsibleUserId"),
    publicationDate: getString(formData, "publicationDate"),
    approvalStatus: getString(
      formData,
      "approvalStatus",
    ) as CommunicationApprovalStatus,
    assetUrl: getString(formData, "assetUrl"),
    clicks: getString(formData, "clicks"),
    registrations: getString(formData, "registrations"),
    reach: getString(formData, "reach"),
    comments: getString(formData, "comments"),
  };
}

export function parseCommunicationDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatCommunicationFormDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function optionalCommunicationValue(value: string) {
  const normalized = value.trim();
  return normalized || null;
}
