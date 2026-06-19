import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateDueDate, planTaskDueDate } from "./reverse-planning";

const eventDate = new Date("2026-10-15T00:00:00.000Z");

describe("Rückwärtsplanung", () => {
  it("berechnet offsetDays -45 als 45 Tage vor dem Event", () => {
    assert.equal(
      calculateDueDate(eventDate, -45).toISOString().slice(0, 10),
      "2026-08-31",
    );
  });

  it("berechnet offsetDays 0 auf den Eventtag", () => {
    assert.equal(
      calculateDueDate(eventDate, 0).toISOString().slice(0, 10),
      "2026-10-15",
    );
  });

  it("berechnet offsetDays 3 als drei Tage nach dem Event", () => {
    assert.equal(
      calculateDueDate(eventDate, 3).toISOString().slice(0, 10),
      "2026-10-18",
    );
  });

  it("schützt eine manuell überschriebene Fälligkeit", () => {
    const manualDueDate = new Date("2026-09-20T00:00:00.000Z");
    const protectedPlan = planTaskDueDate(
      {
        dueDate: manualDueDate,
        offsetDays: -45,
        isDueDateManuallyOverridden: true,
      },
      eventDate,
    );

    assert.equal(protectedPlan.shouldUpdate, false);
    assert.equal(protectedPlan.reason, "manual_override");
    assert.equal(protectedPlan.dueDate?.getTime(), manualDueDate.getTime());

    const confirmedPlan = planTaskDueDate(
      {
        dueDate: manualDueDate,
        offsetDays: -45,
        isDueDateManuallyOverridden: true,
      },
      eventDate,
      true,
    );

    assert.equal(confirmedPlan.shouldUpdate, true);
    assert.equal(
      confirmedPlan.dueDate.toISOString().slice(0, 10),
      "2026-08-31",
    );
  });
});
