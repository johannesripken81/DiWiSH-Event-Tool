import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FollowUpStatus } from "@/generated/prisma/enums";

import { calculateParticipantMetrics } from "./metrics";

describe("Teilnehmermanagement", () => {
  it("berechnet Anmeldungen, Teilnahmen und No-Show-Quote", () => {
    const metrics = calculateParticipantMetrics([
      {
        registered: true,
        attended: true,
        followUpNeeded: false,
        followUpStatus: FollowUpStatus.NOT_REQUIRED,
      },
      {
        registered: true,
        attended: false,
        followUpNeeded: true,
        followUpStatus: FollowUpStatus.OPEN,
      },
      {
        registered: false,
        attended: false,
        followUpNeeded: false,
        followUpStatus: FollowUpStatus.NOT_REQUIRED,
      },
    ]);

    assert.equal(metrics.registered, 2);
    assert.equal(metrics.attended, 1);
    assert.equal(metrics.noShowRate, 50);
    assert.equal(metrics.openFollowUps, 1);
  });

  it("zählt erledigte oder nicht erforderliche Follow-ups nicht als offen", () => {
    const metrics = calculateParticipantMetrics([
      {
        registered: true,
        attended: true,
        followUpNeeded: true,
        followUpStatus: FollowUpStatus.COMPLETED,
      },
      {
        registered: true,
        attended: true,
        followUpNeeded: false,
        followUpStatus: FollowUpStatus.NOT_REQUIRED,
      },
    ]);

    assert.equal(metrics.openFollowUps, 0);
    assert.equal(metrics.noShowRate, 0);
  });
});
