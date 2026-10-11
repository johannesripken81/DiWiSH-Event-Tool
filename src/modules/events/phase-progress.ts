import { EventPhase, type TaskStatus } from "@/generated/prisma/enums";
import { CLOSED_TASK_STATUSES } from "./metrics";

export function calculatePhaseProgress(
  rows: { phase: EventPhase; status: TaskStatus; count: number }[],
) {
  return Object.values(EventPhase).map((phase) => {
    const phaseRows = rows.filter((row) => row.phase === phase);
    const total = phaseRows.reduce((sum, row) => sum + row.count, 0);
    const completed = phaseRows
      .filter((row) =>
        CLOSED_TASK_STATUSES.some((status) => status === row.status),
      )
      .reduce((sum, row) => sum + row.count, 0);
    return {
      phase,
      total,
      completed,
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });
}
