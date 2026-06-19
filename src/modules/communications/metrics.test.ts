import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CommunicationApprovalStatus } from "@/generated/prisma/enums";

import { isCommunicationMeasureOverdue } from "./metrics";

const today = new Date("2026-06-13T00:00:00.000Z");

describe("Kommunikationsplan", () => {
  it("markiert eine nicht freigegebene Veröffentlichung in der Vergangenheit als überfällig", () => {
    assert.equal(
      isCommunicationMeasureOverdue(
        {
          publicationDate: new Date("2026-06-12T00:00:00.000Z"),
          approvalStatus: CommunicationApprovalStatus.IN_REVIEW,
        },
        today,
      ),
      true,
    );
  });

  it("markiert freigegebene oder zukünftige Veröffentlichungen nicht als überfällig", () => {
    assert.equal(
      isCommunicationMeasureOverdue(
        {
          publicationDate: new Date("2026-06-12T00:00:00.000Z"),
          approvalStatus: CommunicationApprovalStatus.APPROVED,
        },
        today,
      ),
      false,
    );
    assert.equal(
      isCommunicationMeasureOverdue(
        {
          publicationDate: new Date("2026-06-14T00:00:00.000Z"),
          approvalStatus: CommunicationApprovalStatus.DRAFT,
        },
        today,
      ),
      false,
    );
  });
});
