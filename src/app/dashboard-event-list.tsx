import Link from "next/link";
import type { getDashboardData } from "@/modules/dashboard/queries";
import { formatEventDate } from "@/modules/events/presentation";

export function DashboardEventList({
  events,
}: {
  events: Awaited<ReturnType<typeof getDashboardData>>["upcomingEvents"];
}) {
  return (
    <div className="divide-y divide-slate-100 px-5">
      {events.map((event) => (
        <Link
          className="flex items-center gap-4 py-4"
          href={`/events/${event.id}`}
          key={event.id}
        >
          <div className="bg-brand-50 text-brand-800 grid size-12 shrink-0 place-items-center rounded-lg text-center text-xs font-extrabold">
            {new Intl.DateTimeFormat("de-DE", {
              day: "2-digit",
              month: "short",
              timeZone: "UTC",
            }).format(event.eventDate)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">{event.title}</p>
            <p className="text-muted mt-1 text-xs">
              {formatEventDate(event.eventDate)} ·{" "}
              {event.location ?? "Location offen"}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                {event.totalTasks === 0
                  ? "Noch keine Aufgaben"
                  : `${event.completedTasks} / ${event.totalTasks} abgeschlossen · ${event.progress}%`}
              </span>
              {event.overdueTasks > 0 ? (
                <span className="font-semibold text-red-700">
                  {event.overdueTasks} überfällig
                </span>
              ) : null}
            </div>
            <div
              role="progressbar"
              aria-label={`Umsetzungsstand ${event.title}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={event.progress}
              aria-valuetext={
                event.totalTasks === 0
                  ? "Noch keine Aufgaben"
                  : `${event.progress}% abgeschlossen`
              }
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
            >
              <div
                className="bg-brand-700 h-full rounded-full"
                style={{ width: `${event.progress}%` }}
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
