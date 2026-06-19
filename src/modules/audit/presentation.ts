import {
  EventStatus,
  TaskPriority,
  TaskStatus,
  type Prisma,
} from "@/generated/prisma/client";
import {
  formatDate,
  getEventStatusPresentation,
  getTaskPriorityPresentation,
  getTaskStatusPresentation,
} from "@/modules/events/presentation";

const actionLabels: Record<string, string> = {
  CREATED: "Erstellt",
  UPDATED: "Geändert",
  STATUS_CHANGED: "Status geändert",
  DUE_DATE_RECALCULATED: "Fälligkeit neu berechnet",
  EVENT_CREATED: "Event erstellt",
  EVENT_UPDATED: "Event geändert",
  TASK_CREATED: "Aufgabe erstellt",
  TASK_UPDATED: "Aufgabe geändert",
  TASK_STATUS_CHANGED: "Status geändert",
  TASK_DUE_DATE_CHANGED: "Fälligkeit geändert",
  TASK_RESPONSIBLE_CHANGED: "Verantwortliche Person geändert",
  TASK_APPROVED: "Prüfung bestätigt",
  TASK_COMPLETED: "Aufgabe erledigt",
};

const fieldLabels: Record<string, string> = {
  title: "Titel",
  description: "Beschreibung",
  eventDate: "Eventdatum",
  startTime: "Startzeit",
  endTime: "Endzeit",
  location: "Location",
  format: "Format",
  goal: "Ziele, Nutzenversprechen, gewünschtes Ergebnis",
  targetAudience: "Zielgruppe",
  eventLeadName: "Event Lead",
  coLeadName: "Co-Lead",
  communicationOwnerName: "Kommunikation",
  budgetFrame: "Budgetrahmen",
  participantGoal: "Teilnehmerziel",
  registrationUrl: "Eventlink",
  feedbackFormUrl: "Feedbackformular",
  status: "Status",
  phase: "Phase",
  priority: "Priorität",
  dueDate: "Fälligkeit",
  responsibleUserName: "Verantwortlich",
  reviewerUserName: "Prüfer/in",
  isCritical: "Kritisch",
  approvalRequired: "Prüfung erforderlich",
  approvedByName: "Geprüft durch",
  approvedAt: "Geprüft am",
  completedAt: "Erledigt am",
  reason: "Grund",
};

const hiddenLegacyEventFields = new Set([
  "valueProposition",
  "desiredOutcome",
  "presentationUrl",
  "photoFolderUrl",
]);

function isJsonObject(
  value: Prisma.JsonValue | null,
): value is Prisma.JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getAuditActionLabel(action: string) {
  return actionLabels[action] ?? action;
}

export function getAuditFieldLabel(field: string) {
  return fieldLabels[field] ?? field;
}

export function getAuditChanges(
  oldValue: Prisma.JsonValue | null,
  newValue: Prisma.JsonValue | null,
) {
  const before = isJsonObject(oldValue) ? oldValue : {};
  const after = isJsonObject(newValue) ? newValue : {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...keys]
    .filter((field) => !hiddenLegacyEventFields.has(field))
    .map((field) => ({
      field,
      label: getAuditFieldLabel(field),
      oldValue: formatAuditValue(field, before[field]),
      newValue: formatAuditValue(field, after[field]),
    }));
}

function formatAuditValue(field: string, value: Prisma.JsonValue | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Nicht gesetzt";
  }

  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }

  if (field === "status" && typeof value === "string") {
    if (Object.values(TaskStatus).includes(value as TaskStatus)) {
      return getTaskStatusPresentation(value as TaskStatus).label;
    }

    if (Object.values(EventStatus).includes(value as EventStatus)) {
      return getEventStatusPresentation(value as EventStatus).label;
    }
  }

  if (
    field === "priority" &&
    typeof value === "string" &&
    Object.values(TaskPriority).includes(value as TaskPriority)
  ) {
    return getTaskPriorityPresentation(value as TaskPriority).label;
  }

  if (
    (field.endsWith("Date") || field.endsWith("At") || field === "eventDate") &&
    typeof value === "string"
  ) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return formatDate(date);
    }
  }

  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : JSON.stringify(value);
}
