import {
  EventPhase,
  EventStatus,
  PlannerSyncStatus,
  TaskPriority,
  TaskStatus,
} from "@/generated/prisma/enums";
import type { EventTaskModel as EventTask } from "@/generated/prisma/models/EventTask";
import type { StatusColor } from "@/components/ui";

export const eventStatusOptions = [
  EventStatus.DRAFT,
  EventStatus.PLANNING,
  EventStatus.EXECUTION,
  EventStatus.FOLLOW_UP,
  EventStatus.COMPLETED,
  EventStatus.CANCELLED,
  EventStatus.ARCHIVED,
] as const;

export const taskStatusOptions = [
  TaskStatus.OPEN,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.BLOCKED,
  TaskStatus.COMPLETED,
  TaskStatus.CANCELLED,
] as const;

export const taskPriorityOptions = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.CRITICAL,
] as const;

export const eventPhaseOptions = [
  EventPhase.CONCEPTION,
  EventPhase.FOUR_EYES_REVIEW,
  EventPhase.LOCATION_CATERING,
  EventPhase.SPEAKERS_PARTNERS,
  EventPhase.COMMUNICATION,
  EventPhase.PARTICIPANT_MANAGEMENT,
  EventPhase.MATERIAL_PRESENTATION,
  EventPhase.TECHNOLOGY,
  EventPhase.EVENT_DAY,
  EventPhase.FOLLOW_UP,
  EventPhase.EVALUATION,
] as const;

const eventStatusPresentation: Record<
  EventStatus,
  { label: string; color: StatusColor }
> = {
  DRAFT: { label: "Entwurf", color: "gray" },
  PLANNING: { label: "Planung", color: "blue" },
  EXECUTION: { label: "Durchführung", color: "yellow" },
  FOLLOW_UP: { label: "Nachbereitung", color: "yellow" },
  COMPLETED: { label: "Abgeschlossen", color: "green" },
  CANCELLED: { label: "Abgesagt", color: "red" },
  ARCHIVED: { label: "Archiviert", color: "gray" },
};

const taskStatusPresentation: Record<
  TaskStatus,
  { label: string; color: StatusColor }
> = {
  OPEN: { label: "Offen", color: "gray" },
  IN_PROGRESS: { label: "In Bearbeitung", color: "blue" },
  BLOCKED: { label: "Blockiert", color: "red" },
  IN_REVIEW: { label: "Wartet auf Prüfung", color: "yellow" },
  COMPLETED: { label: "Erledigt", color: "green" },
  CANCELLED: { label: "Entfällt", color: "gray" },
};

const phaseLabels: Record<EventPhase, string> = {
  CONCEPTION: "Konzeption",
  FOUR_EYES_REVIEW: "Vier-Augen-Prüfung",
  LOCATION_CATERING: "Location & Catering",
  SPEAKERS_PARTNERS: "Speaker & Partner",
  COMMUNICATION: "Kommunikation",
  PARTICIPANT_MANAGEMENT: "Teilnehmermanagement",
  MATERIAL_PRESENTATION: "Material & Präsentation",
  TECHNOLOGY: "Technik",
  EVENT_DAY: "Eventtag",
  FOLLOW_UP: "Nachbereitung",
  EVALUATION: "Evaluation",
};

const priorityPresentation: Record<
  TaskPriority,
  { label: string; color: StatusColor }
> = {
  LOW: { label: "Niedrig", color: "gray" },
  MEDIUM: { label: "Mittel", color: "blue" },
  HIGH: { label: "Hoch", color: "yellow" },
  CRITICAL: { label: "Kritisch", color: "red" },
};

const plannerSyncPresentation: Record<
  PlannerSyncStatus,
  { label: string; color: StatusColor }
> = {
  NOT_SYNCED: { label: "Nicht synchronisiert", color: "gray" },
  PENDING: { label: "Ausstehend", color: "yellow" },
  SYNCED: { label: "Synchronisiert", color: "green" },
  ERROR: { label: "Fehler", color: "red" },
  DISABLED: { label: "Deaktiviert", color: "gray" },
};

export function getEventStatusPresentation(status: EventStatus) {
  return eventStatusPresentation[status];
}

export function getTaskStatusPresentation(status: TaskStatus) {
  return taskStatusPresentation[status];
}

export function getTaskPriorityPresentation(priority: TaskPriority) {
  return priorityPresentation[priority];
}

export function getPlannerSyncPresentation(status: PlannerSyncStatus) {
  return plannerSyncPresentation[status];
}

export function getPhaseLabel(phase: EventPhase) {
  return phaseLabels[phase];
}

export function formatDate(date: Date | null) {
  if (!date) {
    return "Nicht festgelegt";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTime(date: Date | null) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatEventDateTime(
  eventDate: Date,
  startTime: Date | null,
  endTime: Date | null,
) {
  const date = formatDate(eventDate);
  const start = formatTime(startTime);
  const end = formatTime(endTime);

  if (start && end) {
    return `${date}, ${start}–${end} Uhr`;
  }

  if (start) {
    return `${date}, ${start} Uhr`;
  }

  return date;
}

export function compareTasksByDueDate<
  T extends Pick<EventTask, "dueDate" | "title">,
>(first: T, second: T) {
  if (!first.dueDate && !second.dueDate) {
    return first.title.localeCompare(second.title, "de");
  }

  if (!first.dueDate) {
    return 1;
  }

  if (!second.dueDate) {
    return -1;
  }

  return first.dueDate.getTime() - second.dueDate.getTime();
}

export function getSafeExternalUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
