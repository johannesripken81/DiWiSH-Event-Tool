import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  EmptyState,
  PageHeader,
  PrimaryLink,
  StatusBadge,
} from "@/components/ui";
import { TaskStatus } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  isOpenTask,
  isOverdueTask,
  isTaskDueSoon,
} from "@/modules/events/metrics";
import {
  eventPhaseOptions,
  formatDate,
  getPhaseLabel,
  getTaskPriorityPresentation,
  getTaskStatusPresentation,
  taskPriorityOptions,
  taskStatusOptions,
} from "@/modules/events/presentation";
import {
  getEventTaskPlanning,
  isEventPhase,
  isTaskDueFilter,
  isTaskPriority,
  isTaskStatus,
  type EventTaskFilters,
} from "@/modules/tasks/queries";

import { changeTaskStatusAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type PlanningTask = Awaited<
  ReturnType<typeof getEventTaskPlanning>
>["tasks"][number];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getTaskRowPresentation(task: PlanningTask, today: Date) {
  if (task.status === TaskStatus.COMPLETED) {
    return {
      row: "bg-emerald-50/65",
      due: "text-emerald-800",
      hint: "Erledigt",
    };
  }

  if (task.status === TaskStatus.CANCELLED) {
    return {
      row: "bg-slate-100/80 text-slate-500",
      due: "text-slate-500",
      hint: "Entfällt",
    };
  }

  if (isOverdueTask(task, today)) {
    return {
      row: "bg-red-50/75",
      due: "text-red-800",
      hint: "Überfällig",
    };
  }

  if (isTaskDueSoon(task, today)) {
    return {
      row: "bg-amber-50/75",
      due: "text-amber-900",
      hint: "In den nächsten 7 Tagen",
    };
  }

  if (task.status === TaskStatus.IN_PROGRESS) {
    return {
      row: "bg-blue-50/65",
      due: "text-blue-800",
      hint: null,
    };
  }

  return {
    row: "hover:bg-slate-50/80",
    due: "text-slate-700",
    hint: null,
  };
}

function StatusAction({
  eventId,
  taskId,
  status,
  children,
  className,
}: {
  eventId: string;
  taskId: string;
  status: TaskStatus;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <form action={changeTaskStatusAction}>
      <input name="eventId" type="hidden" value={eventId} />
      <input name="taskId" type="hidden" value={taskId} />
      <input name="status" type="hidden" value={status} />
      <button
        className={`inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-semibold transition ${className}`}
        type="submit"
      >
        {children}
      </button>
    </form>
  );
}

function TaskDoneToggle({
  eventId,
  task,
  canChangeStatus,
}: {
  eventId: string;
  task: PlanningTask;
  canChangeStatus: boolean;
}) {
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isCancelled = task.status === TaskStatus.CANCELLED;
  const nextStatus = isCompleted ? TaskStatus.OPEN : TaskStatus.COMPLETED;
  const label = isCompleted
    ? "Aufgabe wieder öffnen"
    : "Aufgabe als erledigt markieren";
  const checkboxClass = `mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border text-sm font-bold transition ${
    isCompleted
      ? "border-emerald-600 bg-emerald-600 text-white"
      : isCancelled
        ? "border-slate-300 bg-slate-100 text-slate-400"
        : "border-slate-300 bg-white text-transparent hover:border-emerald-500 hover:bg-emerald-50"
  }`;

  if (!canChangeStatus || isCancelled) {
    return (
      <span
        aria-label={
          isCompleted
            ? "Aufgabe ist erledigt"
            : isCancelled
              ? "Aufgabe entfällt"
              : "Status kann nicht geändert werden"
        }
        className={checkboxClass}
        title={
          isCompleted
            ? "Erledigt"
            : isCancelled
              ? "Entfällt"
              : "Keine Berechtigung zum Ändern"
        }
      >
        {isCompleted ? "✓" : isCancelled ? "–" : ""}
      </span>
    );
  }

  return (
    <form action={changeTaskStatusAction} className="shrink-0">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="taskId" type="hidden" value={task.id} />
      <input name="status" type="hidden" value={nextStatus} />
      <button
        aria-label={`${label}: ${task.title}`}
        aria-pressed={isCompleted}
        className={checkboxClass}
        title={label}
        type="submit"
      >
        {isCompleted ? "✓" : ""}
      </button>
    </form>
  );
}

export default async function EventTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const statusValue = firstValue(query.status);
  const phaseValue = firstValue(query.phase);
  const responsibleUserId = firstValue(query.responsibleUserId);
  const priorityValue = firstValue(query.priority);
  const dueValue = firstValue(query.due);
  const filters: EventTaskFilters = {
    status: isTaskStatus(statusValue) ? statusValue : undefined,
    phase: isEventPhase(phaseValue) ? phaseValue : undefined,
    responsibleUserId: responsibleUserId || undefined,
    priority: isTaskPriority(priorityValue) ? priorityValue : undefined,
    due: isTaskDueFilter(dueValue) ? dueValue : "all",
    criticalOnly: firstValue(query.critical) === "true",
  };
  const planning = await getEventTaskPlanning(id, filters);
  const currentUser = await getCurrentUser();

  if (!planning.event) {
    notFound();
  }

  const event = planning.event;
  const canCreateTasks = hasPermission(
    currentUser,
    Permission.MANAGE_ALL_TASKS,
  );
  const hasFilters = Boolean(
    filters.status ||
    filters.phase ||
    filters.responsibleUserId ||
    filters.priority ||
    filters.due !== "all" ||
    filters.criticalOnly,
  );

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}`}
      >
        ← Zurück zum Event-Cockpit
      </Link>

      <PageHeader
        action={
          canCreateTasks ? (
            <PrimaryLink href={`/events/${event.id}/tasks/new`}>
              Aufgabe anlegen
            </PrimaryLink>
          ) : undefined
        }
        description={`Aufgaben, Verantwortlichkeiten und Termine für „${event.title}“ steuern.`}
        eyebrow="Event-Operations"
        title="Aufgabenplanung"
      />

      <Card className="mb-5">
        <form
          className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-7"
          method="get"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Status
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.status ?? ""}
              name="status"
            >
              <option value="">Alle Status</option>
              {taskStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {getTaskStatusPresentation(status).label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Phase
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.phase ?? ""}
              name="phase"
            >
              <option value="">Alle Phasen</option>
              {eventPhaseOptions.map((phase) => (
                <option key={phase} value={phase}>
                  {getPhaseLabel(phase)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Verantwortlich
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.responsibleUserId ?? ""}
              name="responsibleUserId"
            >
              <option value="">Alle Personen</option>
              {planning.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Priorität
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.priority ?? ""}
              name="priority"
            >
              <option value="">Alle Prioritäten</option>
              {taskPriorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {getTaskPriorityPresentation(priority).label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Fälligkeit
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.due}
              name="due"
            >
              <option value="all">Alle Termine</option>
              <option value="overdue">Überfällig</option>
              <option value="next7">Nächste 7 Tage</option>
            </select>
          </label>

          <label className="flex min-h-10 items-center gap-2 self-end rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">
            <input
              defaultChecked={filters.criticalOnly}
              name="critical"
              type="checkbox"
              value="true"
            />
            Nur kritisch
          </label>

          <div className="flex items-end gap-2">
            <button
              className="bg-brand-900 hover:bg-brand-800 min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold text-white"
              type="submit"
            >
              Filtern
            </button>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              href={`/events/${event.id}/tasks`}
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          {planning.tasks.length} von {planning.totalTasks} Aufgaben
        </p>
        <p className="text-xs leading-5 text-slate-500">
          Checkbox: als erledigt markieren · Details bearbeiten: Inhalt,
          Zuständige und Termin ändern
        </p>
      </div>

      <Card>
        {planning.tasks.length === 0 ? (
          <EmptyState
            action={
              hasFilters ? (
                <Link
                  className="text-brand-700 text-sm font-semibold hover:underline"
                  href={`/events/${event.id}/tasks`}
                >
                  Filter zurücksetzen
                </Link>
              ) : canCreateTasks ? (
                <PrimaryLink href={`/events/${event.id}/tasks/new`}>
                  Erste Aufgabe anlegen
                </PrimaryLink>
              ) : undefined
            }
            description={
              hasFilters
                ? "Für die gewählten Filter wurden keine Aufgaben gefunden."
                : "Für dieses Event sind noch keine Aufgaben angelegt."
            }
            title="Keine Aufgaben gefunden"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Aufgabe</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Verantwortlich</th>
                  <th className="px-4 py-3">Prüfer/in</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priorität</th>
                  <th className="px-4 py-3">Fällig am</th>
                  <th className="px-4 py-3">Kritisch</th>
                  <th className="px-5 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planning.tasks.map((task) => {
                  const status = getTaskStatusPresentation(task.status);
                  const priority = getTaskPriorityPresentation(task.priority);
                  const row = getTaskRowPresentation(task, planning.today);
                  const canUpdateTask = hasPermission(
                    currentUser,
                    Permission.UPDATE_TASK,
                    { responsibleUserId: task.responsibleUserId },
                  );
                  const canChangeStatus = hasPermission(
                    currentUser,
                    Permission.CHANGE_TASK_STATUS,
                    { responsibleUserId: task.responsibleUserId },
                  );

                  return (
                    <tr className={row.row} key={task.id}>
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <TaskDoneToggle
                            canChangeStatus={canChangeStatus}
                            eventId={event.id}
                            task={task}
                          />
                          <div>
                            {canUpdateTask ? (
                              <Link
                                className="text-brand-950 hover:text-brand-700 font-bold"
                                href={`/events/${event.id}/tasks/${task.id}/edit`}
                              >
                                {task.title}
                              </Link>
                            ) : (
                              <span className="text-brand-950 font-bold">
                                {task.title}
                              </span>
                            )}
                            {task.description ? (
                              <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                {task.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {getPhaseLabel(task.phase)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {task.responsibleUser?.name ?? "Nicht zugewiesen"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {task.reviewerUser?.name ?? "Nicht zugewiesen"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge color={status.color}>
                          {status.label}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge color={priority.color}>
                          {priority.label}
                        </StatusBadge>
                      </td>
                      <td className={`px-4 py-4 font-semibold ${row.due}`}>
                        {formatDate(task.dueDate)}
                        {row.hint ? (
                          <span className="mt-1 block text-xs">{row.hint}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            task.isCritical
                              ? "font-bold text-red-700"
                              : "text-slate-500"
                          }
                        >
                          {task.isCritical ? "Ja" : "Nein"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canUpdateTask ? (
                            <Link
                              className="inline-flex min-h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              href={`/events/${event.id}/tasks/${task.id}/edit`}
                            >
                              Details bearbeiten
                            </Link>
                          ) : null}
                          {canChangeStatus && isOpenTask(task) ? (
                            <StatusAction
                              className="bg-slate-200 text-slate-700 hover:bg-slate-300"
                              eventId={event.id}
                              status={TaskStatus.CANCELLED}
                              taskId={task.id}
                            >
                              Entfällt
                            </StatusAction>
                          ) : canChangeStatus ? (
                            <StatusAction
                              className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                              eventId={event.id}
                              status={TaskStatus.OPEN}
                              taskId={task.id}
                            >
                              Wieder öffnen
                            </StatusAction>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
