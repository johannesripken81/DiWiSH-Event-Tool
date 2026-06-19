import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateNoShowRate } from "./metrics";

describe("Evaluation und Wirkung", () => {
  it("berechnet die No-Show-Quote aus Anmeldungen und Teilnehmenden", () => {
    assert.equal(calculateNoShowRate(100, 82), 18);
    assert.equal(calculateNoShowRate(24, 20), 16.7);
  });

  it("liefert ohne belastbare Anmeldezahl keine Quote", () => {
    assert.equal(calculateNoShowRate(0, 0), null);
    assert.equal(calculateNoShowRate(null, 12), null);
    assert.equal(calculateNoShowRate(20, null), null);
  });

  it("begrenzt die Quote bei mehr Teilnehmenden als Anmeldungen auf null Prozent", () => {
    assert.equal(calculateNoShowRate(20, 22), 0);
  });
});
