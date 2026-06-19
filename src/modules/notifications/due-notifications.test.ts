import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotificationType, TaskStatus } from "@/generated/prisma/enums";

import {
  filterNewNotificationPlans,
  planDueNotifications,
  type DueNotificationTask,
} from "./due-notifications";

const today = new Date("2026-06-13T00:00:00.000Z");

function task(
  dueDate: string,
  overrides: Partial<DueNotificationTask> = {},
): DueNotificationTask {
  return {
    id: "task-1",
    title: "Einladung versenden",
    dueDate: new Date(`${dueDate}T00:00:00.000Z`),
    status: TaskStatus.OPEN,
    isCritical: false,
    reminderEnabled: true,
    responsibleUserId: "responsible-1",
    reviewerUserId: "reviewer-1",
    event: {
      title: "DIWISH Netzwerktreffen",
      eventLeadId: "lead-1",
    },
    ...overrides,
  };
}

describe("Aufgabenbenachrichtigungen", () => {
  it("plant Erinnerungen genau 7 Tage, 3 Tage und am Fälligkeitstag", () => {
    assert.deepEqual(
      planDueNotifications(task("2026-06-20"), today).map((plan) => plan.type),
      [NotificationType.TASK_DUE_IN_7_DAYS],
    );
    assert.deepEqual(
      planDueNotifications(task("2026-06-16"), today).map((plan) => plan.type),
      [NotificationType.TASK_DUE_IN_3_DAYS],
    );
    assert.deepEqual(
      planDueNotifications(task("2026-06-13"), today).map((plan) => plan.type),
      [NotificationType.TASK_DUE_TODAY],
    );
  });

  it("plant nach einem Tag Überfälligkeit eine Erinnerung", () => {
    const plans = planDueNotifications(task("2026-06-12"), today);

    assert.equal(plans.length, 1);
    assert.equal(plans[0].type, NotificationType.TASK_OVERDUE_1_DAY);
    assert.equal(plans[0].userId, "responsible-1");
  });

  it("eskaliert jede kritische überfällige Aufgabe an den Event Lead", () => {
    const plans = planDueNotifications(
      task("2026-06-08", { isCritical: true }),
      today,
    );

    assert.equal(plans.length, 1);
    assert.equal(plans[0].type, NotificationType.CRITICAL_TASK_OVERDUE);
    assert.equal(plans[0].userId, "lead-1");
    assert.equal(plans[0].isEscalation, true);
  });

  it("erzeugt bei einer seit einem Tag überfälligen kritischen Aufgabe beide Regeltypen", () => {
    const types = planDueNotifications(
      task("2026-06-12", { isCritical: true }),
      today,
    ).map((plan) => plan.type);

    assert.deepEqual(types, [
      NotificationType.TASK_OVERDUE_1_DAY,
      NotificationType.CRITICAL_TASK_OVERDUE,
    ]);
  });

  it("ignoriert erledigte, entfallene und deaktivierte Aufgaben", () => {
    assert.equal(
      planDueNotifications(
        task("2026-06-20", { status: TaskStatus.COMPLETED }),
        today,
      ).length,
      0,
    );
    assert.equal(
      planDueNotifications(
        task("2026-06-20", { status: TaskStatus.CANCELLED }),
        today,
      ).length,
      0,
    );
    assert.equal(
      planDueNotifications(
        task("2026-06-20", { reminderEnabled: false }),
        today,
      ).length,
      0,
    );
  });

  it("filtert bereits erzeugte Reminder-Typen über den Deduplizierungsschlüssel", () => {
    const plans = planDueNotifications(task("2026-06-20"), today);
    const remaining = filterNewNotificationPlans(plans, [
      plans[0].deduplicationKey,
    ]);

    assert.equal(remaining.length, 0);
  });
});
