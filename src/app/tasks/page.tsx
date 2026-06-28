import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { formatDate } from "@/modules/events/presentation";
import {
  getTaskOverviewEvents,
  isTaskOverviewView,
  type TaskOverviewView,
} from "@/modules/tasks/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aufgaben",
};

type SearchParams = Record<string, string | string[] | undefined>;

const taskViews: Array<{
  key: TaskOverviewView;
  label: string;
  description: string;
}> = [
  {
    key: "all",
    label: "Alle Events",
    description: "Gesamte Aufgabenlage",
  },
  {
    key: "mine",
    label: "Meine Aufgaben",
    description: "Offene Aufgaben mit eigener Verantwortung",
  },
  {
    key: "overdue",
    label: "Überfällig",
    description: "Events mit verpassten Fristen",
  },
  {
    key: "readiness",
    label: "Eventbereit prüfen",
    description: "Kritische offene Aufgaben",
  },
  {
    key: "followUp",
    label: "Follow-ups offen",
    description: "Nachbereitung und Kontakte",
  },
];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getTaskView(value: string | string[] | undefined): TaskOverviewView {
  const view = firstValue(value);
  return isTaskOverviewView(view) ? view : "all";
}

function getViewHref(view: TaskOverviewView) {
  return view === "all" ? "/tasks" : `/tasks?view=${view}`;
}

function getPlanningHref(
  eventId: string,
  view: TaskOverviewView,
  currentUserId: string,
) {
  switch (view) {
    case "mine":
      return `/events/${eventId}/tasks?responsibleUserId=${currentUserId}`;
    case "overdue":
      return `/events/${eventId}/tasks?due=overdue`;
    case "readiness":
      return `/events/${eventId}/tasks?critical=true`;
    case "followUp":
      return `/events/${eventId}/tasks?readinessArea=followUp`;
    case "all":
      return `/events/${eventId}/tasks`;
  }
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.READ_EVENT)) {
    redirect("/");
  }

  const activeView = getTaskView(query.view);
  const activeViewLabel =
    taskViews.find((view) => view.key === activeView)?.label ?? "Alle Events";
  const events = await getTaskOverviewEvents(activeView, currentUser.id);

  return (
    <>
      <PageHeader
        description="Wähle eine Arbeitsansicht und springe direkt in die passende Aufgabenliste."
        eyebrow="Arbeitsübersicht"
        title={`Aufgabenplanung · ${activeViewLabel}`}
      />

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {taskViews.map((view) => {
          const active = view.key === activeView;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                active
                  ? "border-brand-300 bg-brand-50 text-brand-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-slate-50"
              }`}
              href={getViewHref(view.key)}
              key={view.key}
            >
              <span className="block text-sm font-bold">{view.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {view.description}
              </span>
            </Link>
          );
        })}
      </div>

      <Card>
        {events.length === 0 ? (
          <EmptyState
            description="In dieser Arbeitsansicht gibt es aktuell keine passenden Events."
            title="Keine Treffer"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Fortschritt</th>
                  <th className="px-4 py-3">Offen</th>
                  <th className="px-4 py-3">Überfällig</th>
                  <th className="px-4 py-3">Kritisch</th>
                  <th className="px-4 py-3">Follow-ups</th>
                  <th className="px-5 py-3 text-right">Aufgaben</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr className="hover:bg-slate-50/80" key={event.id}>
                    <td className="px-5 py-4 font-bold text-slate-800">
                      {event.title}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatDate(event.eventDate)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-32 items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="bg-brand-700 h-full rounded-full"
                            style={{ width: `${event.metrics.progress}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">
                          {event.metrics.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {event.metrics.openTasks}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        color={event.metrics.overdueTasks > 0 ? "red" : "green"}
                      >
                        {event.metrics.overdueTasks}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        color={
                          event.metrics.criticalOpenTasks > 0 ? "red" : "gray"
                        }
                      >
                        {event.metrics.criticalOpenTasks}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        color={
                          event.metrics.followUpOpenItems > 0 ? "blue" : "gray"
                        }
                      >
                        {event.metrics.followUpOpenItems}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold text-white"
                        href={getPlanningHref(
                          event.id,
                          activeView,
                          currentUser.id,
                        )}
                        prefetch={false}
                      >
                        Ansicht öffnen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
