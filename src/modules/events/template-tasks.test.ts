import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EventPhase,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@/generated/prisma/enums";

import {
  createEventTasksFromTemplate,
  type TemplateTaskSource,
} from "./template-tasks";

const eventDate = new Date("2026-10-15T00:00:00.000Z");
const users = [
  { id: "lead", role: UserRole.EVENT_LEAD },
  { id: "co-lead", role: UserRole.EVENT_LEAD },
  { id: "communication", role: UserRole.COMMUNICATION },
  { id: "team", role: UserRole.TEAM_MEMBER },
  { id: "admin", role: UserRole.ADMIN },
];

function template(
  values: Partial<TemplateTaskSource> & Pick<TemplateTaskSource, "title">,
): TemplateTaskSource {
  return {
    description: null,
    phase: EventPhase.CONCEPTION,
    defaultResponsibleRole: UserRole.EVENT_LEAD,
    defaultReviewerRole: null,
    priority: TaskPriority.MEDIUM,
    offsetDays: 0,
    approvalRequired: false,
    isCritical: false,
    ...values,
  };
}

describe("Template-Aufgabenerzeugung", () => {
  it("erzeugt Aufgaben mit korrekten Fälligkeiten und Standardwerten", () => {
    const tasks = createEventTasksFromTemplate(
      [
        template({
          title: "Einladung versenden",
          phase: EventPhase.COMMUNICATION,
          defaultResponsibleRole: UserRole.COMMUNICATION,
          priority: TaskPriority.HIGH,
          offsetDays: -45,
          isCritical: true,
        }),
        template({
          title: "Feedback versenden",
          phase: EventPhase.FOLLOW_UP,
          defaultResponsibleRole: UserRole.TEAM_MEMBER,
          offsetDays: 3,
        }),
      ],
      {
        eventId: "event-1",
        eventDate,
        eventLeadId: "lead",
        coLeadId: "co-lead",
        communicationOwnerId: "communication",
        users,
      },
    );

    assert.equal(tasks.length, 2);
    assert.equal(tasks[0].eventId, "event-1");
    assert.equal(tasks[0].status, TaskStatus.OPEN);
    assert.equal(tasks[0].responsibleUserId, "communication");
    assert.equal(tasks[0].dueDate.toISOString().slice(0, 10), "2026-08-31");
    assert.equal(tasks[0].isCritical, true);
    assert.equal(tasks[1].responsibleUserId, "team");
    assert.equal(tasks[1].dueDate.toISOString().slice(0, 10), "2026-10-18");
  });

  it("weist Event Lead und Co-Lead getrennt als Verantwortung und Prüfung zu", () => {
    const [task] = createEventTasksFromTemplate(
      [
        template({
          title: "Konzept prüfen",
          defaultResponsibleRole: UserRole.EVENT_LEAD,
          defaultReviewerRole: UserRole.EVENT_LEAD,
          approvalRequired: true,
        }),
      ],
      {
        eventId: "event-1",
        eventDate,
        eventLeadId: "lead",
        coLeadId: "co-lead",
        communicationOwnerId: "communication",
        users,
      },
    );

    assert.equal(task.responsibleUserId, "lead");
    assert.equal(task.reviewerUserId, "co-lead");
    assert.equal(task.approvalRequired, true);
  });

  it("lässt nicht verfügbare Rollen bewusst unzugewiesen", () => {
    const [task] = createEventTasksFromTemplate(
      [
        template({
          title: "Gastaufgabe",
          defaultResponsibleRole: UserRole.GUEST,
          defaultReviewerRole: UserRole.GUEST,
        }),
      ],
      {
        eventId: "event-1",
        eventDate,
        eventLeadId: "lead",
        coLeadId: null,
        communicationOwnerId: null,
        users,
      },
    );

    assert.equal(task.responsibleUserId, null);
    assert.equal(task.reviewerUserId, null);
  });
});
