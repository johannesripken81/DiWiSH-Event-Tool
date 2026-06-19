import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getChangedAuditValues } from "./audit-log";

describe("Audit Logging", () => {
  it("speichert nur tatsächlich geänderte alte und neue Werte", () => {
    const changes = getChangedAuditValues(
      {
        title: "Alte Aufgabe",
        status: "OPEN",
        dueDate: null,
      },
      {
        title: "Neue Aufgabe",
        status: "OPEN",
        dueDate: "2026-06-20T00:00:00.000Z",
      },
    );

    assert.equal(changes.hasChanges, true);
    assert.deepEqual(changes.oldValue, {
      title: "Alte Aufgabe",
      dueDate: null,
    });
    assert.deepEqual(changes.newValue, {
      title: "Neue Aufgabe",
      dueDate: "2026-06-20T00:00:00.000Z",
    });
  });

  it("erkennt unveränderte Werte", () => {
    const changes = getChangedAuditValues(
      { status: "OPEN" },
      { status: "OPEN" },
    );

    assert.equal(changes.hasChanges, false);
    assert.deepEqual(changes.oldValue, {});
    assert.deepEqual(changes.newValue, {});
  });
});
