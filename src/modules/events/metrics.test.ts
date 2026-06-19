import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TaskStatus } from "@/generated/prisma/enums";

import { calculateTaskMetrics, isOverdueTask, isTaskDueSoon } from "./metrics";

const today = new Date("2026-06-14T00:00:00.000Z");

function task(
  dueDate: string | null,
  status: TaskStatus = TaskStatus.OPEN,
  isCritical = false,
) {
  return {
    status,
    dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null,
    isCritical,
  };
}

describe("Aufgabenstatus nach Fälligkeit", () => {
  it("markiert nur offene Aufgaben vor dem heutigen Datum als überfällig", () => {
    assert.equal(isOverdueTask(task("2026-06-13"), today), true);
    assert.equal(isOverdueTask(task("2026-06-14"), today), false);
    assert.equal(
      isOverdueTask(task("2026-06-13", TaskStatus.COMPLETED), today),
      false,
    );
    assert.equal(
      isOverdueTask(task("2026-06-13", TaskStatus.CANCELLED), today),
      false,
    );
  });

  it("markiert offene Aufgaben von heute bis einschließlich sieben Tagen als bald fällig", () => {
    assert.equal(isTaskDueSoon(task("2026-06-14"), today), true);
    assert.equal(isTaskDueSoon(task("2026-06-21"), today), true);
    assert.equal(isTaskDueSoon(task("2026-06-22"), today), false);
    assert.equal(isTaskDueSoon(task("2026-06-13"), today), false);
    assert.equal(
      isTaskDueSoon(task("2026-06-20", TaskStatus.COMPLETED), today),
      false,
    );
  });

  it("berechnet offene, überfällige und kritische Aufgaben konsistent", () => {
    const metrics = calculateTaskMetrics(
      [
        task("2026-06-13", TaskStatus.OPEN, true),
        task("2026-06-20", TaskStatus.IN_PROGRESS),
        task("2026-06-12", TaskStatus.COMPLETED),
        task("2026-06-11", TaskStatus.CANCELLED, true),
      ],
      today,
    );

    assert.deepEqual(metrics, {
      totalTasks: 3,
      completedTasks: 1,
      openTasks: 2,
      overdueTasks: 1,
      criticalOpenTasks: 1,
      progress: 33,
    });
  });
});
