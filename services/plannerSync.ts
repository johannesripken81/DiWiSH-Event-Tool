import { PlannerSyncStatus } from "@/generated/prisma/enums";

export type PlannerSyncOperation =
  | "CREATE_PLANNER_TASK"
  | "UPDATE_PLANNER_TASK"
  | "COMPLETE_PLANNER_TASK"
  | "SYNC_COMPLETION_BACK";

export type PlannerSyncStubResult = {
  implemented: false;
  operation: PlannerSyncOperation;
  syncStatus: typeof PlannerSyncStatus.DISABLED;
  eventTaskId: string | null;
  plannerTaskId: string | null;
  message: string;
};

function requireIdentifier(value: string, label: string) {
  const identifier = value.trim();

  if (!identifier) {
    throw new TypeError(`${label} ist erforderlich.`);
  }

  return identifier;
}

function createStubResult({
  operation,
  eventTaskId = null,
  plannerTaskId = null,
}: {
  operation: PlannerSyncOperation;
  eventTaskId?: string | null;
  plannerTaskId?: string | null;
}): PlannerSyncStubResult {
  return {
    implemented: false,
    operation,
    syncStatus: PlannerSyncStatus.DISABLED,
    eventTaskId,
    plannerTaskId,
    message:
      "Die Microsoft-Planner-Integration ist vorbereitet, aber noch nicht aktiviert.",
  };
}

/**
 * Future entry point for creating a Planner task from the web app.
 * This stub intentionally performs no database write and no network request.
 */
export async function createPlannerTaskFromEventTask(taskId: string) {
  return createStubResult({
    operation: "CREATE_PLANNER_TASK",
    eventTaskId: requireIdentifier(taskId, "EventTask-ID"),
  });
}

/**
 * Future entry point for pushing approved EventTask changes to Planner.
 * Callers must evaluate plannerSyncStatus before invoking a real adapter.
 */
export async function updatePlannerTaskFromEventTask(taskId: string) {
  return createStubResult({
    operation: "UPDATE_PLANNER_TASK",
    eventTaskId: requireIdentifier(taskId, "EventTask-ID"),
  });
}

/**
 * Future entry point for completing the linked Planner task.
 */
export async function markPlannerTaskCompleted(taskId: string) {
  return createStubResult({
    operation: "COMPLETE_PLANNER_TASK",
    eventTaskId: requireIdentifier(taskId, "EventTask-ID"),
  });
}

/**
 * Future callback entry point for mapping a Planner completion to EventTask.
 * plannerTaskId is the stable external mapping key.
 */
export async function syncPlannerCompletionBack(plannerTaskId: string) {
  return createStubResult({
    operation: "SYNC_COMPLETION_BACK",
    plannerTaskId: requireIdentifier(plannerTaskId, "Planner-Task-ID"),
  });
}
