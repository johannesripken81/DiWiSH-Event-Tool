import { z } from "zod";

import { EventPhase, TaskPriority, TaskStatus } from "@/generated/prisma/enums";

const optionalId = z.string().trim().max(100);
const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Bitte gib ein gültiges Datum an.",
  );

export const taskFormSchema = z
  .object({
    eventId: z.string().trim().min(1, "Das Event fehlt."),
    taskId: optionalId,
    title: z
      .string()
      .trim()
      .min(3, "Der Titel muss mindestens 3 Zeichen lang sein.")
      .max(200, "Der Titel darf höchstens 200 Zeichen lang sein."),
    description: z.string().trim().max(5000, "Die Beschreibung ist zu lang."),
    phase: z.enum(EventPhase, {
      error: "Bitte wähle eine Phase.",
    }),
    responsibleUserId: optionalId,
    reviewerUserId: optionalId,
    status: z.enum(TaskStatus, {
      error: "Bitte wähle einen Status.",
    }),
    priority: z.enum(TaskPriority, {
      error: "Bitte wähle eine Priorität.",
    }),
    dueDate: optionalDate,
    isCritical: z.boolean(),
    approvalRequired: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      value.responsibleUserId &&
      value.reviewerUserId &&
      value.responsibleUserId === value.reviewerUserId
    ) {
      context.addIssue({
        code: "custom",
        path: ["reviewerUserId"],
        message:
          "Verantwortliche Person und Prüfer/in müssen unterschiedlich sein.",
      });
    }

    if (value.dueDate) {
      const date = new Date(`${value.dueDate}T00:00:00.000Z`);

      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value.dueDate
      ) {
        context.addIssue({
          code: "custom",
          path: ["dueDate"],
          message: "Bitte gib ein gültiges Datum an.",
        });
      }
    }
  });

export type TaskFormValues = {
  eventId: string;
  taskId: string;
  title: string;
  description: string;
  phase: EventPhase;
  responsibleUserId: string;
  reviewerUserId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  isCritical: boolean;
  approvalRequired: boolean;
};

export type TaskFormState = {
  values: TaskFormValues;
  fieldErrors: Partial<Record<keyof TaskFormValues, string[]>>;
  formError?: string;
};

export function getEmptyTaskFormValues(eventId: string): TaskFormValues {
  return {
    eventId,
    taskId: "",
    title: "",
    description: "",
    phase: EventPhase.CONCEPTION,
    responsibleUserId: "",
    reviewerUserId: "",
    status: TaskStatus.OPEN,
    priority: TaskPriority.MEDIUM,
    dueDate: "",
    isCritical: false,
    approvalRequired: false,
  };
}

function getString(formData: FormData, name: keyof TaskFormValues) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function getTaskFormValues(formData: FormData): TaskFormValues {
  return {
    eventId: getString(formData, "eventId"),
    taskId: getString(formData, "taskId"),
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    phase: getString(formData, "phase") as EventPhase,
    responsibleUserId: getString(formData, "responsibleUserId"),
    reviewerUserId: getString(formData, "reviewerUserId"),
    status: getString(formData, "status") as TaskStatus,
    priority: getString(formData, "priority") as TaskPriority,
    dueDate: getString(formData, "dueDate"),
    isCritical: formData.get("isCritical") === "on",
    approvalRequired: formData.get("approvalRequired") === "on",
  };
}

export function parseTaskDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function formatTaskFormDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function optionalTaskValue(value: string) {
  const normalized = value.trim();
  return normalized || null;
}
