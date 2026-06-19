import { TaskStatus, type EventTask } from "@/generated/prisma/client";

type MetricTask = Pick<EventTask, "status" | "dueDate" | "isCritical">;

export const CLOSED_TASK_STATUSES = [
  TaskStatus.COMPLETED,
  TaskStatus.CANCELLED,
] as const;

export function getTodayUtc() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function isOpenTask(task: Pick<EventTask, "status">) {
  return !CLOSED_TASK_STATUSES.includes(
    task.status as (typeof CLOSED_TASK_STATUSES)[number],
  );
}

export function isOverdueTask(
  task: Pick<EventTask, "status" | "dueDate">,
  today = getTodayUtc(),
) {
  return isOpenTask(task) && task.dueDate !== null && task.dueDate < today;
}

export function isTaskDueSoon(
  task: Pick<EventTask, "status" | "dueDate">,
  today = getTodayUtc(),
  days = 7,
) {
  const lastDueDate = new Date(today);
  lastDueDate.setUTCDate(lastDueDate.getUTCDate() + days);

  return (
    isOpenTask(task) &&
    task.dueDate !== null &&
    task.dueDate >= today &&
    task.dueDate <= lastDueDate
  );
}

export function calculateTaskMetrics(
  tasks: MetricTask[],
  today = getTodayUtc(),
) {
  const relevantTasks = tasks.filter(
    (task) => task.status !== TaskStatus.CANCELLED,
  );
  const completedTasks = relevantTasks.filter(
    (task) => task.status === TaskStatus.COMPLETED,
  ).length;
  const openTasks = tasks.filter(isOpenTask).length;
  const overdueTasks = tasks.filter((task) =>
    isOverdueTask(task, today),
  ).length;
  const criticalOpenTasks = tasks.filter(
    (task) => task.isCritical && isOpenTask(task),
  ).length;
  const progress =
    relevantTasks.length === 0
      ? 0
      : Math.round((completedTasks / relevantTasks.length) * 100);

  return {
    totalTasks: relevantTasks.length,
    completedTasks,
    openTasks,
    overdueTasks,
    criticalOpenTasks,
    progress,
  };
}
