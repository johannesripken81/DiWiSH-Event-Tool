import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getEmptyRunOfShowFormValues,
  runOfShowFormSchema,
} from "./run-of-show-form";
import { sortRunOfShowItems } from "./schedule";

function time(value: string) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

describe("Regieplan", () => {
  it("sortiert Programmpunkte chronologisch nach Startzeit", () => {
    const sorted = sortRunOfShowItems([
      {
        programItem: "Panel",
        startTime: time("11:00"),
        endTime: time("12:00"),
      },
      {
        programItem: "Begrüßung",
        startTime: time("09:00"),
        endTime: time("09:15"),
      },
      {
        programItem: "Keynote",
        startTime: time("09:15"),
        endTime: time("10:00"),
      },
    ]);

    assert.deepEqual(
      sorted.map((item) => item.programItem),
      ["Begrüßung", "Keynote", "Panel"],
    );
  });

  it("verhindert eine Endzeit vor der Startzeit", () => {
    const values = getEmptyRunOfShowFormValues("event-1");
    values.programItem = "Begrüßung";
    values.startTime = "10:00";
    values.endTime = "09:45";

    const result = runOfShowFormSchema.safeParse(values);

    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.flatten().fieldErrors.endTime);
    }
  });
});
