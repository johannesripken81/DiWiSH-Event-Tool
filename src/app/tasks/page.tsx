import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { formatDate } from "@/modules/events/presentation";
import { getTaskOverviewEvents } from "@/modules/tasks/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aufgaben",
};

export default async function TasksPage() {
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.READ_EVENT)) {
    redirect("/");
  }

  const events = await getTaskOverviewEvents();

  return (
    <>
      <PageHeader
        description="Wähle ein Event aus, um Aufgaben, Verantwortlichkeiten und Fristen zu bearbeiten."
        eyebrow="Arbeitsübersicht"
        title="Aufgabenplanung"
      />

      <Card>
        {events.length === 0 ? (
          <EmptyState
            description="Lege zuerst ein Event an. Danach kann die Aufgabenplanung direkt geöffnet werden."
            title="Noch keine Events vorhanden"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Fortschritt</th>
                  <th className="px-4 py-3">Offen</th>
                  <th className="px-4 py-3">Überfällig</th>
                  <th className="px-4 py-3">Kritisch</th>
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
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold text-white"
                        href={`/events/${event.id}/tasks`}
                      >
                        Planung öffnen
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
