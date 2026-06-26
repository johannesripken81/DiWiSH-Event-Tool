import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDueTaskEmailDigestMessage,
  buildDueTaskEmailMessage,
  filterUnsentDueTaskEmailCandidates,
  getDueTaskEmailDigestDeliveryKey,
  getDueTaskEmailDeliveryKey,
  parseDueTaskEmailDeliveryState,
  type DueTaskEmailCandidate,
} from "./due-task-emails";

function task(overrides: Partial<DueTaskEmailCandidate> = {}) {
  return {
    id: "task-1",
    title: "Einladung versenden",
    dueDate: new Date("2026-06-20T00:00:00.000Z"),
    responsibleUser: {
      id: "user-1",
      name: "Verena",
      email: "verena@diwish.de",
    },
    event: {
      id: "event-1",
      title: "DIWISH Netzwerktreffen",
    },
    ...overrides,
  } satisfies DueTaskEmailCandidate;
}

describe("Fälligkeits-E-Mails", () => {
  it("dedupliziert pro Aufgabe und Fälligkeitsdatum", () => {
    const candidate = task();
    const key = getDueTaskEmailDeliveryKey(candidate);
    const state = parseDueTaskEmailDeliveryState({
      sent: {
        [key]: {
          key,
          taskId: candidate.id,
          userId: candidate.responsibleUser.id,
          email: candidate.responsibleUser.email,
          dueDate: "2026-06-20",
          sentAt: "2026-06-20T06:00:00.000Z",
        },
      },
    });

    assert.equal(
      filterUnsentDueTaskEmailCandidates([candidate], state).length,
      0,
    );
    assert.equal(
      filterUnsentDueTaskEmailCandidates(
        [task({ dueDate: new Date("2026-06-21T00:00:00.000Z") })],
        state,
      ).length,
      1,
    );
  });

  it("erstellt Text- und HTML-Mail mit direktem Aufgabenlink", () => {
    const message = buildDueTaskEmailMessage({
      appBaseUrl: "https://events.diwish.de",
      from: "DIWISH Event Tool <events@diwish.de>",
      task: task(),
    });

    assert.equal(message.to, "verena@diwish.de");
    assert.match(message.subject, /Aufgabe heute fällig/);
    assert.match(message.text, /Einladung versenden/);
    assert.match(
      message.text,
      /https:\/\/events\.diwish\.de\/events\/event-1\/tasks\/task-1\/edit/,
    );
    assert.match(message.html, /DIWISH Netzwerktreffen/);
  });

  it("kann alle Erinnerungen als zentrale Tagesübersicht senden", () => {
    const tasks = [
      task(),
      task({
        id: "task-2",
        title: "Technikcheck durchführen",
        responsibleUser: {
          id: "user-2",
          name: "Inga",
          email: "inga@diwish.de",
        },
        event: {
          id: "event-2",
          title: "Fachgruppe KI",
        },
      }),
    ];
    const message = buildDueTaskEmailDigestMessage({
      appBaseUrl: "https://events.diwish.de",
      dueDate: new Date("2026-06-20T00:00:00.000Z"),
      from: "DIWISH Event Tool <mail@diwish.de>",
      recipient: "diwish@wtsh.de",
      tasks,
    });

    assert.equal(message.to, "diwish@wtsh.de");
    assert.match(message.subject, /2 Aufgaben/);
    assert.match(message.text, /Verena <verena@diwish.de>/);
    assert.match(message.text, /Inga <inga@diwish.de>/);
    assert.match(message.text, /Einladung versenden/);
    assert.match(message.text, /Technikcheck durchführen/);
    assert.match(message.html, /Fachgruppe KI/);
  });

  it("dedupliziert zentrale Tagesübersichten pro Empfängeradresse", () => {
    assert.equal(
      getDueTaskEmailDigestDeliveryKey(
        new Date("2026-06-20T00:00:00.000Z"),
        "DIWISH@WTSH.DE",
      ),
      "due-task-email-digest:2026-06-20:diwish@wtsh.de",
    );
  });
});
