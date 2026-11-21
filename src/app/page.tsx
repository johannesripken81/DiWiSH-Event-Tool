import Link from "next/link";
import { DashboardEventList } from "./dashboard-event-list";

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
  const showPastEvents = firstValue(query.showPastEvents) === "true";
  const getDashboardHref = (
    person = responsibleUserId,
    past = showPastEvents,
  ) => {
    const params = new URLSearchParams();
    if (person) params.set("responsibleUserId", person);
    if (past) params.set("showPastEvents", "true");
    return params.size ? `/?${params}` : "/";
  };
  const dashboardHref = getDashboardHref();
  const today = getTodayUtc();
  const nextSevenDays = addDays(today, 7);
  const { activeEvents, dashboardTasks, upcomingEvents, pastEvents, users } =
    await getDashboardData({
      nextSevenDays,
      selectedResponsibleUserId,
      selectedUnassigned,
      showPastEvents,
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
                {showPastEvents ? (
                  <input type="hidden" name="showPastEvents" value="true" />
                ) : null}
                <Link
                  className="text-brand-700 inline-flex min-h-10 items-center text-sm font-semibold hover:underline"
                  href={getDashboardHref(currentUser.id)}
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
                    href={getDashboardHref("")}
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
                    href={getDashboardHref("")}
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
                              dashboardHref,
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
              {activeEvents} bevorstehende aktive Events · Vorschau:{" "}
              {upcomingEvents.length}
            </p>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="p-5">
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Es gibt aktuell keine bevorstehenden aktiven Events.
              </p>
            </div>
          ) : (
            <DashboardEventList events={upcomingEvents} />
          )}
          <div className="border-t border-slate-200">
            <Link
              className="text-brand-700 inline-flex min-h-11 items-center px-5 text-sm font-semibold hover:underline"
              href={getDashboardHref(responsibleUserId, !showPastEvents)}
              aria-expanded={showPastEvents}
              aria-controls="past-events"
            >
              {showPastEvents
                ? "Vergangene Events ausblenden"
                : "Vergangene Events anzeigen"}
            </Link>
            {showPastEvents ? (
              <div id="past-events">
                <h3 className="px-5 text-sm font-bold text-slate-700">
                  Vergangene Events
                </h3>
                <p className="px-5 pt-1 text-xs text-slate-500">
                  Die letzten acht Events. Offene Nachbereitungsaufgaben bleiben
                  in der Aufgabenliste sichtbar.
                </p>
                {pastEvents.length > 0 ? (
                  <DashboardEventList events={pastEvents} />
                ) : (
                  <p className="p-5 text-sm text-slate-500">
                    Keine vergangenen Events vorhanden.
                  </p>
                )}
                <Link
                  href="/events?period=past"
                  className="text-brand-700 mb-4 inline-block px-5 text-sm font-semibold hover:underline"
                >
                  Alle vergangenen Events ansehen
                </Link>
              </div>
            ) : null}
          </div>
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
