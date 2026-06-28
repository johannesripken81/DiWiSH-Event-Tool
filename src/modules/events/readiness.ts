import { EventPhase, TaskStatus } from "@/generated/prisma/enums";

export type ReadinessEvent = {
  title: string;
  eventDate: Date | null;
  format: string | null;
  location: string | null;
  goal: string | null;
  targetAudience: string | null;
  eventLeadId: string | null;
  communicationOwnerId: string | null;
};

export type ReadinessTask = {
  title: string;
  phase: EventPhase;
  status: TaskStatus;
  isCritical: boolean;
  approvalRequired: boolean;
  responsibleUserId: string | null;
  dueDate: Date | null;
};

export type ReadinessArea = {
  key:
    | "setup"
    | "concept"
    | "communication"
    | "operations"
    | "onsiteRoles"
    | "participants"
    | "followUp";
  label: string;
  maxPoints: number;
  awardedPoints: number;
  complete: boolean;
  explanation: string;
};

export type ReadinessLevel = {
  label: "Eventbereit" | "Solide, aber prüfen" | "Risiko" | "Kritisch";
  tone: "green" | "blue" | "yellow" | "red";
};

function hasValue(value: string | null) {
  return Boolean(value?.trim());
}

function isCompleted(task: ReadinessTask) {
  return task.status === TaskStatus.COMPLETED;
}

function activeTasks(tasks: ReadinessTask[]) {
  return tasks.filter((task) => task.status !== TaskStatus.CANCELLED);
}

function completionArea({
  key,
  label,
  maxPoints,
  tasks,
}: {
  key: ReadinessArea["key"];
  label: string;
  maxPoints: number;
  tasks: ReadinessTask[];
}): ReadinessArea {
  const complete = tasks.length > 0 && tasks.every(isCompleted);
  const remaining = tasks.filter((task) => !isCompleted(task)).length;

  return {
    key,
    label,
    maxPoints,
    awardedPoints: complete ? maxPoints : 0,
    complete,
    explanation:
      tasks.length === 0
        ? "Keine relevanten Aufgaben angelegt."
        : complete
          ? "Alle relevanten Aufgaben sind erledigt."
          : `${remaining} von ${tasks.length} relevanten Aufgaben sind noch nicht erledigt.`,
  };
}

function completionAreaFromCounts({
  key,
  label,
  maxPoints,
  remaining,
  total,
}: {
  key: ReadinessArea["key"];
  label: string;
  maxPoints: number;
  remaining: number;
  total: number;
}): ReadinessArea {
  const complete = total > 0 && remaining === 0;

  return {
    key,
    label,
    maxPoints,
    awardedPoints: complete ? maxPoints : 0,
    complete,
    explanation:
      total === 0
        ? "Keine relevanten Aufgaben angelegt."
        : complete
          ? "Alle relevanten Aufgaben sind erledigt."
          : `${remaining} von ${total} relevanten Aufgaben sind noch nicht erledigt.`,
  };
}

function normalizeTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("de-DE");
}

export function getReadinessLevel(score: number): ReadinessLevel {
  if (score >= 90) {
    return { label: "Eventbereit", tone: "green" };
  }

  if (score >= 70) {
    return { label: "Solide, aber prüfen", tone: "blue" };
  }

  if (score >= 50) {
    return { label: "Risiko", tone: "yellow" };
  }

  return { label: "Kritisch", tone: "red" };
}

export function calculateReadinessScore(
  event: ReadinessEvent,
  tasks: ReadinessTask[],
) {
  const relevantTasks = activeTasks(tasks);
  const missingSetupFields = [
    ["Titel", event.title],
    ["Eventdatum", event.eventDate],
    ["Format", event.format],
    ["Location", event.location],
    ["Ziele, Nutzenversprechen, gewünschtes Ergebnis", event.goal],
    ["Zielgruppe", event.targetAudience],
    ["Event Lead", event.eventLeadId],
    ["Kommunikationsverantwortung", event.communicationOwnerId],
  ].flatMap(([label, value]) =>
    value instanceof Date || (typeof value === "string" && hasValue(value))
      ? []
      : [label as string],
  );
  const setupComplete = missingSetupFields.length === 0;
  const setupArea: ReadinessArea = {
    key: "setup",
    label: "Event-Setup vollständig",
    maxPoints: 20,
    awardedPoints: setupComplete ? 20 : 0,
    complete: setupComplete,
    explanation: setupComplete
      ? "Alle MVP-Pflichtangaben sind hinterlegt."
      : `Es fehlen: ${missingSetupFields.join(", ")}.`,
  };

  const conceptArea = completionArea({
    key: "concept",
    label: "Kritische Konzeptaufgaben",
    maxPoints: 15,
    tasks: relevantTasks.filter(
      (task) =>
        task.isCritical &&
        (task.phase === EventPhase.CONCEPTION ||
          task.phase === EventPhase.FOUR_EYES_REVIEW),
    ),
  });

  const communicationArea = completionArea({
    key: "communication",
    label: "Kommunikation bereit und freigegeben",
    maxPoints: 15,
    tasks: relevantTasks.filter(
      (task) =>
        task.phase === EventPhase.COMMUNICATION &&
        (task.isCritical || task.approvalRequired),
    ),
  });

  const operationsArea = completionArea({
    key: "operations",
    label: "Location, Catering und Technik geklärt",
    maxPoints: 20,
    tasks: relevantTasks.filter(
      (task) =>
        task.phase === EventPhase.LOCATION_CATERING ||
        task.phase === EventPhase.TECHNOLOGY,
    ),
  });

  const onsiteRolesArea = completionArea({
    key: "onsiteRoles",
    label: "Vor-Ort-Rollen verteilt",
    maxPoints: 10,
    tasks: relevantTasks.filter((task) => {
      const title = normalizeTitle(task.title);

      return (
        task.phase === EventPhase.EVENT_DAY &&
        title.includes("rollen") &&
        (title.includes("verteil") || title.includes("zuweis"))
      );
    }),
  });

  const participantsArea = completionArea({
    key: "participants",
    label: "Teilnehmermanagement gepflegt",
    maxPoints: 10,
    tasks: relevantTasks.filter(
      (task) => task.phase === EventPhase.PARTICIPANT_MANAGEMENT,
    ),
  });

  const followUpTasks = relevantTasks.filter(
    (task) =>
      task.phase === EventPhase.FOLLOW_UP ||
      task.phase === EventPhase.EVALUATION,
  );
  const unpreparedFollowUpTasks = followUpTasks.filter(
    (task) => !task.responsibleUserId || !task.dueDate,
  );
  const followUpComplete =
    followUpTasks.length > 0 && unpreparedFollowUpTasks.length === 0;
  const followUpArea: ReadinessArea = {
    key: "followUp",
    label: "Feedback und Nachbereitung vorbereitet",
    maxPoints: 10,
    awardedPoints: followUpComplete ? 10 : 0,
    complete: followUpComplete,
    explanation:
      followUpTasks.length === 0
        ? "Keine Aufgaben für Feedback oder Nachbereitung angelegt."
        : followUpComplete
          ? "Verantwortlichkeiten und Fälligkeiten sind hinterlegt."
          : `${unpreparedFollowUpTasks.length} von ${followUpTasks.length} Aufgaben fehlen Verantwortlichkeit oder Fälligkeit.`,
  };

  const areas = [
    setupArea,
    conceptArea,
    communicationArea,
    operationsArea,
    onsiteRolesArea,
    participantsArea,
    followUpArea,
  ];
  const score = areas.reduce((total, area) => total + area.awardedPoints, 0);

  return {
    score,
    level: getReadinessLevel(score),
    areas,
    missingAreas: areas.filter((area) => !area.complete),
  };
}

export type ReadinessStats = {
  communicationRemaining: number;
  communicationTotal: number;
  conceptRemaining: number;
  conceptTotal: number;
  followUpTotal: number;
  followUpUnprepared: number;
  operationsRemaining: number;
  operationsTotal: number;
  onsiteRolesRemaining: number;
  onsiteRolesTotal: number;
  participantsRemaining: number;
  participantsTotal: number;
};

export function calculateReadinessScoreFromStats(
  event: ReadinessEvent,
  stats: ReadinessStats,
) {
  const missingSetupFields = [
    ["Titel", event.title],
    ["Eventdatum", event.eventDate],
    ["Format", event.format],
    ["Location", event.location],
    ["Ziele, Nutzenversprechen, gewÃ¼nschtes Ergebnis", event.goal],
    ["Zielgruppe", event.targetAudience],
    ["Event Lead", event.eventLeadId],
    ["Kommunikationsverantwortung", event.communicationOwnerId],
  ].flatMap(([label, value]) =>
    value instanceof Date || (typeof value === "string" && hasValue(value))
      ? []
      : [label as string],
  );
  const setupComplete = missingSetupFields.length === 0;
  const setupArea: ReadinessArea = {
    key: "setup",
    label: "Event-Setup vollstÃ¤ndig",
    maxPoints: 20,
    awardedPoints: setupComplete ? 20 : 0,
    complete: setupComplete,
    explanation: setupComplete
      ? "Alle MVP-Pflichtangaben sind hinterlegt."
      : `Es fehlen: ${missingSetupFields.join(", ")}.`,
  };
  const followUpComplete =
    stats.followUpTotal > 0 && stats.followUpUnprepared === 0;
  const followUpArea: ReadinessArea = {
    key: "followUp",
    label: "Feedback und Nachbereitung vorbereitet",
    maxPoints: 10,
    awardedPoints: followUpComplete ? 10 : 0,
    complete: followUpComplete,
    explanation:
      stats.followUpTotal === 0
        ? "Keine Aufgaben fÃ¼r Feedback oder Nachbereitung angelegt."
        : followUpComplete
          ? "Verantwortlichkeiten und FÃ¤lligkeiten sind hinterlegt."
          : `${stats.followUpUnprepared} von ${stats.followUpTotal} Aufgaben fehlen Verantwortlichkeit oder FÃ¤lligkeit.`,
  };
  const areas = [
    setupArea,
    completionAreaFromCounts({
      key: "concept",
      label: "Kritische Konzeptaufgaben",
      maxPoints: 15,
      remaining: stats.conceptRemaining,
      total: stats.conceptTotal,
    }),
    completionAreaFromCounts({
      key: "communication",
      label: "Kommunikation bereit und freigegeben",
      maxPoints: 15,
      remaining: stats.communicationRemaining,
      total: stats.communicationTotal,
    }),
    completionAreaFromCounts({
      key: "operations",
      label: "Location, Catering und Technik geklÃ¤rt",
      maxPoints: 20,
      remaining: stats.operationsRemaining,
      total: stats.operationsTotal,
    }),
    completionAreaFromCounts({
      key: "onsiteRoles",
      label: "Vor-Ort-Rollen verteilt",
      maxPoints: 10,
      remaining: stats.onsiteRolesRemaining,
      total: stats.onsiteRolesTotal,
    }),
    completionAreaFromCounts({
      key: "participants",
      label: "Teilnehmermanagement gepflegt",
      maxPoints: 10,
      remaining: stats.participantsRemaining,
      total: stats.participantsTotal,
    }),
    followUpArea,
  ];
  const score = areas.reduce((total, area) => total + area.awardedPoints, 0);

  return {
    score,
    level: getReadinessLevel(score),
    areas,
    missingAreas: areas.filter((area) => !area.complete),
  };
}
