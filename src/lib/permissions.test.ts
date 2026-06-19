import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UserRole } from "@/generated/prisma/enums";

import { hasPermission, Permission } from "./permissions";

const user = (id: string, role: UserRole) => ({ id, role });

describe("Rollen und Rechte", () => {
  it("erlaubt ADMIN jede geprüfte Aktion", () => {
    const admin = user("admin", UserRole.ADMIN);

    for (const permission of Object.values(Permission)) {
      assert.equal(hasPermission(admin, permission), true);
    }
  });

  it("erlaubt EVENT_LEAD die vollständige Event- und Aufgabenverwaltung", () => {
    const lead = user("lead", UserRole.EVENT_LEAD);

    assert.equal(hasPermission(lead, Permission.MANAGE_EVENTS), true);
    assert.equal(hasPermission(lead, Permission.MANAGE_ALL_TASKS), true);
    assert.equal(hasPermission(lead, Permission.APPROVE_TASK), true);
    assert.equal(hasPermission(lead, Permission.MANAGE_EVENT_OPERATIONS), true);
  });

  it("erlaubt COMMUNICATION den Kommunikationsplan und eigene Aufgaben", () => {
    const communication = user("communication", UserRole.COMMUNICATION);

    assert.equal(
      hasPermission(communication, Permission.MANAGE_COMMUNICATION),
      true,
    );
    assert.equal(
      hasPermission(communication, Permission.UPDATE_TASK, {
        responsibleUserId: "communication",
      }),
      true,
    );
    assert.equal(
      hasPermission(communication, Permission.UPDATE_TASK, {
        responsibleUserId: "someone-else",
      }),
      false,
    );
    assert.equal(hasPermission(communication, Permission.MANAGE_EVENTS), false);
  });

  it("erlaubt TEAM_MEMBER nur Änderungen an eigenen Aufgaben", () => {
    const member = user("member", UserRole.TEAM_MEMBER);

    assert.equal(
      hasPermission(member, Permission.CHANGE_TASK_STATUS, {
        responsibleUserId: "member",
      }),
      true,
    );
    assert.equal(
      hasPermission(member, Permission.CHANGE_TASK_STATUS, {
        responsibleUserId: "other",
      }),
      false,
    );
    assert.equal(hasPermission(member, Permission.MANAGE_COMMUNICATION), false);
  });

  it("bereitet GUEST-Lesezugriff mit expliziter Freigabe vor", () => {
    const guest = user("guest", UserRole.GUEST);

    assert.equal(hasPermission(guest, Permission.READ_EVENT), false);
    assert.equal(
      hasPermission(guest, Permission.READ_EVENT, {
        guestAccessEnabled: true,
      }),
      true,
    );
    assert.equal(hasPermission(guest, Permission.UPDATE_TASK), false);
  });
});
