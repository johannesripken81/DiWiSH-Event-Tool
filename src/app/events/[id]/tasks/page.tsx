import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  EmptyState,
  PageHeader,
  PrimaryLink,
  StatusBadge,
} from "@/components/ui";
import { PaginationControls } from "@/components/pagination";
import { PendingSubmitButton } from "@/components/pending-submit-button";
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
  getTaskReadinessAreaLabel,
  isEventPhase,
  isTaskDueFilter,
  isTaskPriority,
  isTaskReadinessAreaFilter,
  isTaskStatus,
  type EventTaskFilters,
} from "@/modules/tasks/queries";

import {
  getTaskHref,
  getTaskListHref,
  getTaskSort,
  type TaskListQuery,
  type TaskSort,
  type TaskSortKey,
} from "@/modules/tasks/list-state";

import {
  getWorkPackageLabel,
  workPackageOptions,
} from "@/modules/tasks/work-packages";

import { changeTaskStatusAction } from "./actions";
import { TaskDoneToggle as OptimisticTaskDoneToggle } from "./task-done-toggle";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type PlanningTask = Awaited<
  ReturnType<typeof getEventTaskPlanning>
>["tasks"][number];
type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPage(value: string | string[] | undefined) {
  const page = Number(firstValue(value) ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
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
      <PendingSubmitButton
        className={`inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-semibold transition ${className}`}
        pendingLabel="Ändert..."
      >
        {children}
      </PendingSubmitButton>
    </form>
  );
}

function SortHeader({
  eventId,
  query,
  sort,
  column,
  children,
}: {
  eventId: string;
  query: TaskListQuery;
  sort: TaskSort;
  column: TaskSortKey;
  children: React.ReactNode;
}) {
  const active = sort.key === column;
  const direction = active && sort.direction === "asc" ? "desc" : "asc";
  const href = getTaskListHref(eventId, {
    ...query,
    page: undefined,
    sort: column,
    direction,
  });
  return (
    <th
      className="px-4 py-3"
      scope="col"
      aria-sort={
        active
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <Link
        className="hover:text-brand-700 inline-flex items-center gap-1"
        href={href}
        title={
          direction === "asc" ? "Aufsteigend sortieren" : "Absteigend sortieren"
        }
      >
        {children}
        <span aria-hidden="true">
          {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}

function TaskPlanningTable({
  currentUser,
  eventId,
  tasks,
  today,
  query,
  sort,
}: {
  currentUser: CurrentUser;
  eventId: string;
  tasks: PlanningTask[];
  today: Date;
  query: TaskListQuery;
  sort: TaskSort;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1250px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="title"
            >
              Aufgabe
            </SortHeader>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="phase"
            >
              Phase
            </SortHeader>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="workPackage"
            >
              Arbeitspaket
            </SortHeader>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="responsible"
            >
              Verantwortlich
            </SortHeader>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="reviewer"
            >
              Prüfer/in
            </SortHeader>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="status"
            >
              Status
            </SortHeader>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="priority"
            >
              Priorität
            </SortHeader>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="dueDate"
            >
              Fällig am
            </SortHeader>
            <SortHeader
              eventId={eventId}
              query={query}
              sort={sort}
              column="isCritical"
            >
              Für das Event kritisch
            </SortHeader>
            <th className="sticky right-0 z-10 bg-slate-50 px-5 py-3 text-right">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const status = getTaskStatusPresentation(task.status);
            const priority = getTaskPriorityPresentation(task.priority);
            const row = getTaskRowPresentation(task, today);
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
                    <OptimisticTaskDoneToggle
                      canChangeStatus={canChangeStatus}
                      changeStatusAction={changeTaskStatusAction}
                      eventId={eventId}
                      key={`${task.id}-${task.status}`}
                      task={task}
                    />
                    <div>
                      <Link
                        className="text-brand-950 hover:text-brand-700 font-bold"
                        href={getTaskHref(
                          eventId,
                          task.id,
                          getTaskListHref(eventId, query),
                        )}
                        prefetch={false}
                      >
                        {task.title}
                      </Link>
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
                  {getWorkPackageLabel(task.workPackage)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {task.responsibleUser?.name ?? "Nicht zugewiesen"}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {task.reviewerUser?.name ?? "Nicht zugewiesen"}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge color={status.color}>{status.label}</StatusBadge>
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
                <td className="sticky right-0 bg-white px-5 py-4 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)]">
                  <div className="flex justify-end gap-2">
                    {canUpdateTask ? (
                      <Link
                        className="inline-flex min-h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        href={getTaskHref(
                          eventId,
                          task.id,
                          getTaskListHref(eventId, query),
                          true,
                        )}
                        prefetch={false}
                      >
                        Details bearbeiten
                      </Link>
                    ) : null}
                    {canChangeStatus && task.status === TaskStatus.OPEN ? (
                      <StatusAction
                        className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                        eventId={eventId}
                        status={TaskStatus.IN_PROGRESS}
                        taskId={task.id}
                      >
                        In Arbeit
                      </StatusAction>
                    ) : null}
                    {canChangeStatus && isOpenTask(task) ? (
                      <StatusAction
                        className="bg-slate-200 text-slate-700 hover:bg-slate-300"
                        eventId={eventId}
                        status={TaskStatus.CANCELLED}
                        taskId={task.id}
                      >
                        Entfällt
                      </StatusAction>
                    ) : canChangeStatus ? (
                      <StatusAction
                        className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                        eventId={eventId}
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
  const readinessAreaValue = firstValue(query.readinessArea);
  const filters: EventTaskFilters = {
    status: isTaskStatus(statusValue) ? statusValue : undefined,
    phase: isEventPhase(phaseValue) ? phaseValue : undefined,
    workPackage: workPackageOptions.includes(
      firstValue(query.workPackage) as (typeof workPackageOptions)[number],
    )
      ? firstValue(query.workPackage)
      : undefined,
    responsibleUserId: responsibleUserId || undefined,
    priority: isTaskPriority(priorityValue) ? priorityValue : undefined,
    due: isTaskDueFilter(dueValue) ? dueValue : "all",
    criticalOnly: firstValue(query.critical) === "true",
    openOnly: firstValue(query.openOnly) === "true",
    readinessArea: isTaskReadinessAreaFilter(readinessAreaValue)
      ? readinessAreaValue
      : undefined,
  };
  const sort = getTaskSort(firstValue(query.sort), firstValue(query.direction));
  const planning = await getEventTaskPlanning(
    id,
    filters,
    getPage(query.page),
    sort,
  );
  const listQuery = {
    ...query,
    page: String(planning.pagination.currentPage),
    sort: sort.key,
    direction: sort.direction,
  };
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
    filters.workPackage ||
    filters.responsibleUserId ||
    filters.priority ||
    filters.due !== "all" ||
    filters.criticalOnly ||
    filters.openOnly ||
    filters.readinessArea,
  );
  const shiftedFollowingTasks = Number.parseInt(
    firstValue(query.shifted) ?? "",
    10,
  );
  const shiftedFollowingTaskCount = Number.isFinite(shiftedFollowingTasks)
    ? shiftedFollowingTasks
    : 0;
  const activeTasks = planning.tasks.filter((task) => isOpenTask(task));
  const completedTasks = planning.tasks.filter((task) => !isOpenTask(task));

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
          <input name="sort" type="hidden" value={sort.key} />
          <input name="direction" type="hidden" value={sort.direction} />
          {filters.readinessArea ? (
            <input
              name="readinessArea"
              type="hidden"
              value={filters.readinessArea}
            />
          ) : null}

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
              Arbeitspaket
            </span>
            <select
              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              name="workPackage"
              defaultValue={filters.workPackage ?? ""}
            >
              <option value="">Alle Arbeitspakete</option>
              {workPackageOptions.map((value) => (
                <option key={value} value={value}>
                  {getWorkPackageLabel(value)}
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

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="openOnly"
              value="true"
              defaultChecked={filters.openOnly}
              className="size-4"
            />
            Nur offene Aufgaben
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

      {shiftedFollowingTaskCount > 0 ? (
        <div
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          <strong>
            {shiftedFollowingTaskCount} nachfolgende{" "}
            {shiftedFollowingTaskCount === 1 ? "Aufgabe" : "Aufgaben"}{" "}
            verschoben.
          </strong>{" "}
          Erledigte und entfallene Aufgaben wurden unverändert gelassen.
        </div>
      ) : null}

      {filters.readinessArea ? (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Readiness-Bereich aktiv:{" "}
            <strong>{getTaskReadinessAreaLabel(filters.readinessArea)}</strong>
          </span>
          <Link
            className="text-brand-700 font-semibold hover:underline"
            href={`/events/${event.id}/tasks`}
          >
            Alle Aufgaben anzeigen
          </Link>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          {planning.filteredTasks} passende von {planning.totalTasks} Aufgaben
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
        ) : activeTasks.length === 0 ? (
          <EmptyState
            description="In dieser Ansicht sind alle gefundenen Aufgaben bereits abgeschlossen (erledigt oder entfällt). Du findest sie im eingeklappten Bereich darunter."
            title="Keine offenen Aufgaben in dieser Ansicht"
          />
        ) : (
          <TaskPlanningTable
            currentUser={currentUser}
            eventId={event.id}
            tasks={activeTasks}
            today={planning.today}
            query={listQuery}
            sort={sort}
          />
        )}
      </Card>

      <PaginationControls
        basePath={`/events/${event.id}/tasks`}
        pagination={planning.pagination}
        query={query}
      />

      {completedTasks.length > 0 ? (
        <details className="shadow-card mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-slate-800 hover:bg-slate-50">
            <span>Abgeschlossene Aufgaben ({completedTasks.length})</span>
            <span className="text-xs font-semibold text-slate-500">
              einklappen/ausklappen
            </span>
          </summary>
          <TaskPlanningTable
            currentUser={currentUser}
            eventId={event.id}
            query={listQuery}
            sort={sort}
            tasks={completedTasks}
            today={planning.today}
          />
        </details>
      ) : null}
    </>
  );
}
