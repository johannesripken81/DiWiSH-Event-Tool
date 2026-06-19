export type ReversePlanningTask = {
  dueDate: Date | null;
  offsetDays: number | null;
  isDueDateManuallyOverridden: boolean;
};

export type DueDatePlan =
  | {
      shouldUpdate: false;
      dueDate: Date | null;
      reason: "missing_offset" | "manual_override" | "unchanged";
    }
  | {
      shouldUpdate: true;
      dueDate: Date;
      reason: "recalculated";
    };

export function calculateDueDate(eventDate: Date, offsetDays: number) {
  const dueDate = new Date(
    Date.UTC(
      eventDate.getUTCFullYear(),
      eventDate.getUTCMonth(),
      eventDate.getUTCDate(),
    ),
  );
  dueDate.setUTCDate(dueDate.getUTCDate() + offsetDays);

  return dueDate;
}

export function planTaskDueDate(
  task: ReversePlanningTask,
  eventDate: Date,
  overwriteManualOverride = false,
): DueDatePlan {
  if (task.offsetDays === null) {
    return {
      shouldUpdate: false,
      dueDate: task.dueDate,
      reason: "missing_offset",
    };
  }

  if (task.isDueDateManuallyOverridden && !overwriteManualOverride) {
    return {
      shouldUpdate: false,
      dueDate: task.dueDate,
      reason: "manual_override",
    };
  }

  const dueDate = calculateDueDate(eventDate, task.offsetDays);

  if (
    task.dueDate?.getTime() === dueDate.getTime() &&
    !task.isDueDateManuallyOverridden
  ) {
    return {
      shouldUpdate: false,
      dueDate,
      reason: "unchanged",
    };
  }

  return {
    shouldUpdate: true,
    dueDate,
    reason: "recalculated",
  };
}
