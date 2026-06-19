import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EventPhase, TaskStatus } from "@/generated/prisma/enums";

import {
  calculateReadinessScore,
  getReadinessLevel,
  type ReadinessEvent,
  type ReadinessTask,
} from "./readiness";

const completeEvent: ReadinessEvent = {
  title: "DIWISH Netzwerktreffen",
  eventDate: new Date("2026-10-15T00:00:00.000Z"),
  format: "Netzwerktreffen",
  location: "Kiel",
  goal: "Kooperationen anbahnen, konkreten Mehrwert vermitteln und neue Projekte vorbereiten",
  targetAudience: "Mittelstand und Forschung",
  eventLeadId: "lead-1",
  communicationOwnerId: "communication-1",
};

function task(
  values: Partial<ReadinessTask> & Pick<ReadinessTask, "title" | "phase">,
): ReadinessTask {
  return {
    status: TaskStatus.COMPLETED,
    isCritical: false,
    approvalRequired: false,
    responsibleUserId: "user-1",
    dueDate: new Date("2026-09-01T00:00:00.000Z"),
    ...values,
  };
}

const completeTasks: ReadinessTask[] = [
  task({
    title: "Ziel und Zielgruppe definieren",
    phase: EventPhase.CONCEPTION,
    isCritical: true,
  }),
  task({
    title: "Konzept im Vier-Augen-Prinzip prüfen",
    phase: EventPhase.FOUR_EYES_REVIEW,
    isCritical: true,
  }),
  task({
    title: "Einladungstext freigeben",
    phase: EventPhase.COMMUNICATION,
    approvalRequired: true,
  }),
  task({
    title: "Einladung versenden",
    phase: EventPhase.COMMUNICATION,
    isCritical: true,
  }),
  task({
    title: "Location und Catering final bestätigen",
    phase: EventPhase.LOCATION_CATERING,
  }),
  task({
    title: "Präsentation und Mikrofone testen",
    phase: EventPhase.TECHNOLOGY,
  }),
  task({
    title: "Vor-Ort-Rollen verteilen",
    phase: EventPhase.EVENT_DAY,
  }),
  task({
    title: "Teilnehmerliste finalisieren",
    phase: EventPhase.PARTICIPANT_MANAGEMENT,
  }),
  task({
    title: "Feedback versenden",
    phase: EventPhase.FOLLOW_UP,
    status: TaskStatus.OPEN,
  }),
  task({
    title: "Debrief durchführen",
    phase: EventPhase.EVALUATION,
    status: TaskStatus.OPEN,
  }),
];

describe("Readiness Score", () => {
  it("vergibt 100 Punkte für ein vollständig vorbereitetes Event", () => {
    const readiness = calculateReadinessScore(completeEvent, completeTasks);

    assert.equal(readiness.score, 100);
    assert.equal(readiness.level.label, "Eventbereit");
    assert.equal(readiness.missingAreas.length, 0);
  });

  it("zieht 20 Punkte bei unvollständigem Event-Setup ab", () => {
    const readiness = calculateReadinessScore(
      { ...completeEvent, goal: null },
      completeTasks,
    );

    assert.equal(readiness.score, 80);
    assert.equal(readiness.level.label, "Solide, aber prüfen");
    assert.match(readiness.missingAreas[0].explanation, /Ziele/);
  });

  it("zieht die Punkte einer nicht erledigten Aufgabenkategorie ab", () => {
    const tasks = completeTasks.map((item) =>
      item.phase === EventPhase.TECHNOLOGY
        ? { ...item, status: TaskStatus.IN_PROGRESS }
        : item,
    );
    const readiness = calculateReadinessScore(completeEvent, tasks);

    assert.equal(readiness.score, 80);
    assert.equal(
      readiness.areas.find((area) => area.key === "operations")?.awardedPoints,
      0,
    );
  });

  it("ordnet die vier Score-Bereiche korrekt zu", () => {
    assert.equal(getReadinessLevel(90).label, "Eventbereit");
    assert.equal(getReadinessLevel(70).label, "Solide, aber prüfen");
    assert.equal(getReadinessLevel(50).label, "Risiko");
    assert.equal(getReadinessLevel(49).label, "Kritisch");
  });
});
