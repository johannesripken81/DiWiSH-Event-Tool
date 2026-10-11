import Link from "next/link";

import {
  Card,
  EmptyState,
  PageHeader,
  PrimaryLink,
  StatusBadge,
} from "@/components/ui";
import { hasPermission, Permission } from "@/lib/permissions";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDashboardData } from "@/modules/dashboard/queries";
import { getTodayUtc } from "@/modules/events/metrics";
import {
  formatDate,
  formatEventDate,
  getPhaseLabel,
  getTaskPriorityPresentation,
} from "@/modules/events/presentation";

import { getWorkPackageLabel } from "@/modules/tasks/work-packages";
import { getTaskHref } from "@/modules/tasks/list-state";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const unassignedFilterValue = "__unassigned";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getDateTile(date: Date) {
  const day = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
  const month = new Intl.DateTimeFormat("de-DE", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();

  return `${day}. ${month}`;
}

function getDueBadge(dueDate: Date, today: Date) {
  const diffDays = Math.round(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return { label: "Überfällig", color: "red" as const };
  }

  if (diffDays === 0) {
    return { label: "Heute", color: "red" as const };
  }

  if (diffDays === 1) {
    return { label: "Morgen", color: "yellow" as const };
  }

  return { label: `In ${diffDays} Tagen`, color: "yellow" as const };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const currentUser = await requireEventReadAccess();

  const query = await searchParams;
  const responsibleUserId = firstValue(query.responsibleUserId);
  const selectedResponsibleUserId =
    responsibleUserId && responsibleUserId !== unassignedFilterValue
      ? responsibleUserId
      : undefined;
  const selectedUnassigned = responsibleUserId === unassignedFilterValue;
  const today = getTodayUtc();
  const nextSevenDays = addDays(today, 7);
  const { activeEvents, dashboardTasks, upcomingEvents, users } =
    await getDashboardData({
      nextSevenDays,
      selectedResponsibleUserId,
      selectedUnassigned,
      today,
    });
  const currentTaskCount = dashboardTasks.length;
  const overdueTaskCount = dashboardTasks.filter(
    (task) => task.dueDate !== null && task.dueDate < today,
  ).length;
  const criticalTaskCount = dashboardTasks.filter(
    (task) => task.isCritical,
  ).length;

  const selectedUser = selectedResponsibleUserId
    ? users.find((user) => user.id === selectedResponsibleUserId)
    : null;
  const filterHint = selectedUnassigned
    ? "Gefiltert: nicht zugewiesene Aufgaben"
    : selectedUser
      ? `Gefiltert: ${selectedUser.name}`
      : "Alle Personen";
  const todayLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date());

  return (
    <>
      <PageHeader
        action={
          hasPermission(currentUser, Permission.MANAGE_EVENTS) ? (
            <PrimaryLink href="/events/new">Neues Event</PrimaryLink>
          ) : undefined
        }
        description="Events mit ihrem Umsetzungsstand und offene Aufgaben bis zur nächsten Woche."
        eyebrow={todayLabel}
        title="Dashboard"
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-brand-950 font-bold">Offene Aufgaben</h2>
                <p className="text-muted mt-1 text-xs">
                  Überfällige Aufgaben und Aufgaben mit Fälligkeit bis{" "}
                  {formatDate(nextSevenDays)} · {filterHint}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {currentTaskCount} offen · {overdueTaskCount} überfällig ·{" "}
                  {criticalTaskCount} kritisch
                </p>
              </div>
              <form className="flex flex-wrap gap-2" method="get">
                <Link
                  className="text-brand-700 inline-flex min-h-10 items-center text-sm font-semibold hover:underline"
                  href={
                    "/?" +
                    new URLSearchParams({ responsibleUserId: currentUser.id })
                  }
                >
                  Meine Aufgaben
                </Link>
                <label className="block">
                  <span className="sr-only">Nach Person filtern</span>
                  <select
                    className="focus:border-brand-500 min-h-10 min-w-56 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none"
                    defaultValue={responsibleUserId ?? ""}
                    name="responsibleUserId"
                  >
                    <option value="">Alle Personen</option>
                    <option value={unassignedFilterValue}>
                      Nicht zugewiesen
                    </option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="bg-brand-900 hover:bg-brand-800 min-h-10 rounded-lg px-4 text-sm font-semibold text-white"
                  type="submit"
                >
                  Filtern
                </button>
                {responsibleUserId ? (
                  <Link
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    href="/"
                  >
                    Reset
                  </Link>
                ) : null}
              </form>
            </div>
          </div>

          {dashboardTasks.length === 0 ? (
            <EmptyState
              action={
                responsibleUserId ? (
                  <Link
                    className="text-brand-700 text-sm font-semibold hover:underline"
                    href="/"
                  >
                    Filter zurücksetzen
                  </Link>
                ) : undefined
              }
              description="Für den ausgewählten Zeitraum gibt es keine offenen Aufgaben."
              title="Keine aktuellen Aufgaben"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Aufgabe</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Verantwortlich</th>
                    <th className="px-5 py-3 text-right">Fällig</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardTasks.map((task) => {
                    const due = getDueBadge(task.dueDate!, today);
                    const priority = getTaskPriorityPresentation(task.priority);

                    return (
                      <tr className="hover:bg-slate-50/80" key={task.id}>
                        <td className="px-5 py-4">
                          <Link
                            className="text-brand-950 hover:text-brand-700 font-bold"
                            href={getTaskHref(
                              task.event.id,
                              task.id,
                              responsibleUserId
                                ? `/?${new URLSearchParams({ responsibleUserId })}`
                                : "/",
                            )}
                          >
                            {task.title}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {getPhaseLabel(task.phase)} ·{" "}
                            {getWorkPackageLabel(task.workPackage)}
                          </p>
                          <span className="mt-1 inline-block">
                            <StatusBadge color={priority.color}>
                              {priority.label}
                            </StatusBadge>
                          </span>
                          {task.isCritical ? (
                            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                              Kritisch
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            className="hover:text-brand-700 font-semibold text-slate-700"
                            href={`/events/${task.event.id}`}
                          >
                            {task.event.title}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            Event am {formatEventDate(task.event.eventDate)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {task.responsibleUser?.name ?? "Nicht zugewiesen"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <StatusBadge color={due.color}>
                            {due.label}
                          </StatusBadge>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {formatDate(task.dueDate)}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">
              Events & Umsetzungsstand
            </h2>
            <p className="text-muted mt-1 text-xs">
              {activeEvents} aktive Events · Vorschau: {upcomingEvents.length}
            </p>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="p-5">
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Es gibt aktuell keine aktiven Events.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-5">
              {upcomingEvents.map((event) => (
                <Link
                  className="flex items-center gap-4 py-4"
                  href={`/events/${event.id}`}
                  key={event.id}
                >
                  <div className="bg-brand-50 text-brand-800 grid size-12 shrink-0 place-items-center rounded-lg text-center text-[10px] leading-3 font-extrabold tracking-wide">
                    {getDateTile(event.eventDate)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      {event.title}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      {formatEventDate(event.eventDate)} ·{" "}
                      {event.location ?? "Location offen"}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
                      <span>
                        {event.totalTasks === 0
                          ? "Noch keine Aufgaben"
                          : event.completedTasks +
                            " / " +
                            event.totalTasks +
                            " abgeschlossen · " +
                            event.progress +
                            "%"}
                      </span>
                      {event.overdueTasks > 0 ? (
                        <span className="font-semibold text-red-700">
                          {event.overdueTasks} überfällig
                        </span>
                      ) : null}
                    </div>
                    <div
                      role="progressbar"
                      aria-label={"Umsetzungsstand " + event.title}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={event.progress}
                      aria-valuetext={
                        event.totalTasks === 0
                          ? "Noch keine Aufgaben"
                          : event.progress + "% abgeschlossen"
                      }
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div
                        className="bg-brand-700 h-full rounded-full"
                        style={{ width: event.progress + "%" }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="border-t border-slate-200 px-5 py-3">
            <Link
              className="text-brand-700 text-sm font-semibold hover:underline"
              href="/events"
            >
              Alle Events ansehen →
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
