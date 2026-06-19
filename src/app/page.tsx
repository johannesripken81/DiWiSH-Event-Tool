import Link from "next/link";

import {
  Card,
  EmptyState,
  PageHeader,
  PrimaryLink,
  StatusBadge,
  type StatusColor,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { requireEventReadAccess } from "@/lib/current-user";
import { getDashboardData } from "@/modules/dashboard/queries";
import { getTodayUtc } from "@/modules/events/metrics";
import {
  formatDate,
  getEventStatusPresentation,
  getPhaseLabel,
  getTaskPriorityPresentation,
} from "@/modules/events/presentation";

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

function StatCard({
  label,
  value,
  hint,
  icon,
  color,
}: {
  label: string;
  value: number;
  hint: string;
  icon: IconName;
  color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted text-sm font-medium">{label}</p>
          <p className="text-brand-950 mt-2 text-3xl font-bold tracking-tight">
            {value}
          </p>
        </div>
        <span className={`grid size-10 place-items-center rounded-lg ${color}`}>
          <Icon className="size-5" name={icon} />
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{hint}</p>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireEventReadAccess();

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
        action={<PrimaryLink href="/events/new">Neues Event</PrimaryLink>}
        description="Offene Aufgaben der nächsten sieben Tage, kommende Events und operative Risiken."
        eyebrow={todayLabel}
        title="Event-Operations Dashboard"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          color="bg-blue-50 text-blue-700"
          hint="Entwurf, Planung, Durchführung oder Nachbereitung"
          icon="events"
          label="Aktive Events"
          value={activeEvents}
        />
        <StatCard
          color="bg-amber-50 text-amber-700"
          hint={filterHint}
          icon="tasks"
          label="Aktuelle Aufgaben"
          value={currentTaskCount}
        />
        <StatCard
          color="bg-red-50 text-red-700"
          hint="Offen und bereits fällig"
          icon="calendar"
          label="Überfällig"
          value={overdueTaskCount}
        />
        <StatCard
          color="bg-emerald-50 text-emerald-700"
          hint="Aktuell, offen und kritisch markiert"
          icon="check"
          label="Kritisch"
          value={criticalTaskCount}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.9fr]">
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-brand-950 font-bold">
                  Aktuelle offene Aufgaben
                </h2>
                <p className="text-muted mt-1 text-xs">
                  Überfällige Aufgaben und Aufgaben mit Fälligkeit bis{" "}
                  {formatDate(nextSevenDays)}
                </p>
              </div>
              <form className="flex flex-col gap-2 sm:flex-row" method="get">
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
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Aufgabe</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Phase</th>
                    <th className="px-4 py-3">Verantwortlich</th>
                    <th className="px-4 py-3">Priorität</th>
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
                            href={`/events/${task.event.id}/tasks`}
                          >
                            {task.title}
                          </Link>
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
                            Event am {formatDate(task.event.eventDate)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {getPhaseLabel(task.phase)}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {task.responsibleUser?.name ?? "Nicht zugewiesen"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge color={priority.color}>
                            {priority.label}
                          </StatusBadge>
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
            <h2 className="text-brand-950 font-bold">Anstehende Events</h2>
            <p className="text-muted mt-1 text-xs">
              Die nächsten Termine im Teamkalender
            </p>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="p-5">
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                Es sind keine kommenden Events geplant.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-5">
              {upcomingEvents.map((event) => {
                const status = getEventStatusPresentation(event.status);

                return (
                  <Link
                    className="flex items-center gap-4 py-4"
                    href={`/events/${event.id}`}
                    key={event.id}
                  >
                    <div className="bg-brand-50 text-brand-800 grid size-12 shrink-0 place-items-center rounded-lg text-center text-[10px] leading-3 font-extrabold tracking-wide">
                      {getDateTile(event.eventDate)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {event.title}
                      </p>
                      <p className="text-muted mt-1 text-xs">
                        {event.location ?? "Location offen"}
                      </p>
                    </div>
                    <StatusBadge color={status.color as StatusColor}>
                      {status.label}
                    </StatusBadge>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
