import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultEventTemplates } from "./default-templates";

describe("Standard-Eventvorlagen", () => {
  it("enthält die gewünschten zusätzlichen Vorlagen mit passendem Vorlauf", () => {
    const templatesByName = new Map(
      defaultEventTemplates.map((template) => [template.name, template]),
    );
    const expectations = [
      ["Große Veranstaltung", -180],
      ["Fachgruppenveranstaltung (Präsenz)", -56],
      ["Fachgruppenveranstaltung (virtuell)", -42],
    ] as const;

    for (const [name, firstOffset] of expectations) {
      const template = templatesByName.get(name);

      assert.ok(template, `${name} fehlt`);
      assert.ok(template.tasks.length > 0, `${name} hat keine Aufgaben`);
      assert.equal(
        Math.min(...template.tasks.map((task) => task.offsetDays)),
        firstOffset,
      );
    }
  });
});
