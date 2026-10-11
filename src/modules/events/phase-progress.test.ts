import assert from "node:assert/strict";
import test from "node:test";
import { EventPhase, TaskStatus } from "@/generated/prisma/enums";
import { calculatePhaseProgress } from "./phase-progress";

test("phase progress counts completed and cancelled tasks, preserving empty phases", () => {
  const phases = calculatePhaseProgress([
    { phase: EventPhase.PLANNING, status: TaskStatus.COMPLETED, count: 2 },
    { phase: EventPhase.PLANNING, status: TaskStatus.CANCELLED, count: 1 },
    { phase: EventPhase.PLANNING, status: TaskStatus.OPEN, count: 1 },
    { phase: EventPhase.EXECUTION, status: TaskStatus.CANCELLED, count: 2 },
  ]);
  assert.equal(phases.length, 4);
  assert.deepEqual(
    phases.map((p) => p.phase),
    [
      EventPhase.CONCEPTION,
      EventPhase.PLANNING,
      EventPhase.EXECUTION,
      EventPhase.FOLLOW_UP,
    ],
  );
  assert.deepEqual(phases[1], {
    phase: EventPhase.PLANNING,
    total: 4,
    completed: 3,
    progress: 75,
  });
  assert.equal(phases[2].progress, 100);
  assert.equal(phases[0].total, 0);
  assert.equal(phases[0].progress, 0);
});
