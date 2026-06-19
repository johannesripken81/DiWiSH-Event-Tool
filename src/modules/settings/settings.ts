import { z } from "zod";

import { EventPhase, TaskPriority, UserRole } from "@/generated/prisma/enums";
import { minimumPasswordLength } from "@/lib/password";

export const workspaceSettingsKey = "workspace";
export const notificationSettingsKey = "notifications";

export const workspaceSettingsSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(1, "Name des Arbeitsbereichs ist erforderlich.")
    .max(120, "Name darf höchstens 120 Zeichen haben."),
  organizationName: z
    .string()
    .trim()
    .max(200, "Organisation darf höchstens 200 Zeichen haben."),
  contactEmail: z
    .string()
    .trim()
    .refine((value) => !value || z.email().safeParse(value).success, {
      message: "Bitte eine gültige E-Mail-Adresse angeben.",
    }),
  websiteUrl: z
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
    }, "Bitte eine gültige HTTP- oder HTTPS-Adresse angeben."),
  defaultLocation: z
    .string()
    .trim()
    .max(200, "Standard-Location darf höchstens 200 Zeichen haben."),
});

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

export const defaultWorkspaceSettings: WorkspaceSettings = {
  workspaceName: "DIWISH Event Operations",
  organizationName: "DIWISH",
  contactEmail: "",
  websiteUrl: "",
  defaultLocation: "",
};

export const notificationSettingsSchema = z.object({
  dueIn7DaysEnabled: z.boolean(),
  dueIn3DaysEnabled: z.boolean(),
  dueTodayEnabled: z.boolean(),
  overdueOneDayEnabled: z.boolean(),
  criticalOverdueEnabled: z.boolean(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const defaultNotificationSettings: NotificationSettings = {
  dueIn7DaysEnabled: true,
  dueIn3DaysEnabled: true,
  dueTodayEnabled: true,
  overdueOneDayEnabled: true,
  criticalOverdueEnabled: true,
};

export const userSettingsSchema = z.object({
  userId: z.string().trim().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name ist erforderlich.")
    .max(120, "Name darf höchstens 120 Zeichen haben."),
  email: z.email("Bitte eine gültige E-Mail-Adresse angeben.").trim(),
  password: z
    .string()
    .trim()
    .refine(
      (value) => !value || value.length >= minimumPasswordLength,
      `Passwort muss mindestens ${minimumPasswordLength} Zeichen haben.`,
    ),
  role: z.enum(UserRole),
});

export const eventTemplateSettingsSchema = z.object({
  templateId: z.string().trim().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name ist erforderlich.")
    .max(120, "Name darf höchstens 120 Zeichen haben."),
  description: z
    .string()
    .trim()
    .max(1000, "Beschreibung darf höchstens 1.000 Zeichen haben."),
});

export const taskTemplateSettingsSchema = z.object({
  taskTemplateId: z.string().trim().optional(),
  eventTemplateId: z.string().trim().min(1),
  title: z
    .string()
    .trim()
    .min(1, "Titel ist erforderlich.")
    .max(200, "Titel darf höchstens 200 Zeichen haben."),
  description: z
    .string()
    .trim()
    .max(2000, "Beschreibung darf höchstens 2.000 Zeichen haben."),
  phase: z.enum(EventPhase),
  defaultResponsibleRole: z.enum(UserRole),
  defaultReviewerRole: z.union([z.enum(UserRole), z.literal("")]),
  priority: z.enum(TaskPriority),
  offsetDays: z
    .string()
    .trim()
    .regex(/^-?\d+$/, "Offset muss eine ganze Zahl sein.")
    .transform(Number)
    .refine((value) => value >= -365 && value <= 365, {
      message: "Offset muss zwischen -365 und 365 Tagen liegen.",
    }),
  approvalRequired: z.boolean(),
  isCritical: z.boolean(),
});

export function getBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export function getString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function parseWorkspaceSettings(formData: FormData) {
  return workspaceSettingsSchema.parse({
    workspaceName: getString(formData, "workspaceName"),
    organizationName: getString(formData, "organizationName"),
    contactEmail: getString(formData, "contactEmail"),
    websiteUrl: getString(formData, "websiteUrl"),
    defaultLocation: getString(formData, "defaultLocation"),
  });
}

export function parseNotificationSettings(formData: FormData) {
  return notificationSettingsSchema.parse({
    dueIn7DaysEnabled: getBoolean(formData, "dueIn7DaysEnabled"),
    dueIn3DaysEnabled: getBoolean(formData, "dueIn3DaysEnabled"),
    dueTodayEnabled: getBoolean(formData, "dueTodayEnabled"),
    overdueOneDayEnabled: getBoolean(formData, "overdueOneDayEnabled"),
    criticalOverdueEnabled: getBoolean(formData, "criticalOverdueEnabled"),
  });
}

export function parseUserSettings(formData: FormData) {
  return userSettingsSchema.parse({
    userId: getString(formData, "userId") || undefined,
    name: getString(formData, "name"),
    email: getString(formData, "email").toLowerCase(),
    password: getString(formData, "password"),
    role: getString(formData, "role"),
  });
}

export function parseEventTemplateSettings(formData: FormData) {
  return eventTemplateSettingsSchema.parse({
    templateId: getString(formData, "templateId") || undefined,
    name: getString(formData, "name"),
    description: getString(formData, "description"),
  });
}

export function parseTaskTemplateSettings(formData: FormData) {
  return taskTemplateSettingsSchema.parse({
    taskTemplateId: getString(formData, "taskTemplateId") || undefined,
    eventTemplateId: getString(formData, "eventTemplateId"),
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    phase: getString(formData, "phase"),
    defaultResponsibleRole: getString(formData, "defaultResponsibleRole"),
    defaultReviewerRole: getString(formData, "defaultReviewerRole"),
    priority: getString(formData, "priority"),
    offsetDays: getString(formData, "offsetDays"),
    approvalRequired: getBoolean(formData, "approvalRequired"),
    isCritical: getBoolean(formData, "isCritical"),
  });
}

export function parseStoredSettings<T>(
  value: unknown,
  schema: z.ZodType<T>,
  defaults: T,
) {
  const result = schema.safeParse(value);
  return result.success ? result.data : defaults;
}
