import type { Metadata } from "next";
import Link from "next/link";

import { PaginationControls } from "@/components/pagination";
import { Card, EmptyState, PageHeader, PrimaryLink } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  getEventListData,
  isEventPeriod,
  type EventPeriod,
} from "@/modules/events/queries";
import { formatDate } from "@/modules/events/presentation";

export const metadata: Metadata = {
  title: "Events",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function getPage(value: string | string[] | undefined) {
  const page = Number(Array.isArray(value) ? value[0] : (value ?? "1"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

const periodOptions: Array<{ value: EventPeriod; label: string }> = [
  { value: "all", label: "Alle Zeiträume" },
  { value: "upcoming", label: "Bevorstehend" },
  { value: "next30", label: "Nächste 30 Tage" },
  { value: "next90", label: "Nächste 90 Tage" },
  { value: "past", label: "Vergangen" },
];

function FilterSelect({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600 uppercase">
        {label}
      </span>
      <select
        className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
        defaultValue={value ?? ""}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const canManageEvents = hasPermission(currentUser, Permission.MANAGE_EVENTS);
  const periodParam = getParam(params, "period");
  const formatParam = getParam(params, "format");
  const eventLeadId = getParam(params, "eventLeadId");
  const search = getParam(params, "search")?.trim();
  const criticalOnly = getParam(params, "critical") === "true";
  const period = isEventPeriod(periodParam) ? periodParam : "all";
  const data = await getEventListData(
    {
      period,
      format: formatParam || undefined,
      eventLeadId: eventLeadId || undefined,
      criticalOnly,
      search: search || undefined,
    },
    getPage(params.page),
  );
  const deleted = getParam(params, "deleted") === "1";
  const deleteError = getParam(params, "delete");
  const hasActiveFilters =
    period !== "all" ||
    Boolean(formatParam) ||
    Boolean(eventLeadId) ||
    Boolean(search) ||
    criticalOnly;

  return (
    <>
      <PageHeader
        action={
          canManageEvents ? (
            <PrimaryLink href="/events/new">Event anlegen</PrimaryLink>
          ) : undefined
        }
        description="Veranstaltungen planen, Zuständigkeiten koordinieren und operative Risiken früh erkennen."
        eyebrow="Eventportfolio"
        title="Events"
      />

      {deleted ? (
        <div
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          role="status"
        >
          Event wurde gelöscht.
        </div>
      ) : null}

      {deleteError ? (
        <div
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          Das Event konnte nicht gelöscht werden oder existiert nicht mehr.
        </div>
      ) : null}

      <Card className="mb-5 p-4 sm:p-5">
        <form
          action="/events"
          className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5"
        >
          <label className="block xl:col-span-2">
            <span className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600 uppercase">
              Suche
            </span>
            <input
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              defaultValue={search ?? ""}
              name="search"
              placeholder="Titel, Ort, Format oder Lead"
              type="search"
            />
          </label>

          <FilterSelect label="Zeitraum" name="period" value={period}>
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Format" name="format" value={formatParam}>
            <option value="">Alle Formate</option>
            {data.formats.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Event Lead"
            name="eventLeadId"
            value={eventLeadId}
          >
            <option value="">Alle Event Leads</option>
            {data.eventLeads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
              </option>
            ))}
          </FilterSelect>

          <div className="flex flex-col justify-end gap-3 xl:col-span-5">
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700">
              <input
                className="accent-brand-900 size-4"
                defaultChecked={criticalOnly}
                name="critical"
                type="checkbox"
                value="true"
              />
              Nur kritische Events
            </label>
            <div className="flex gap-2">
              <button
                className="bg-brand-900 hover:bg-brand-800 min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold text-white"
                type="submit"
              >
                Filter anwenden
              </button>
              {hasActiveFilters ? (
                <Link
                  className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  href="/events"
                >
                  Zurücksetzen
                </Link>
              ) : null}
            </div>
          </div>
        </form>
      </Card>

      <Card>
        {data.events.length === 0 ? (
          <EmptyState
            action={
              hasActiveFilters ? (
                <Link
                  className="text-brand-800 hover:text-brand-950 text-sm font-bold"
                  href="/events"
                >
                  Alle Events anzeigen
                </Link>
              ) : undefined
            }
            description={
              data.totalEvents === 0
                ? "Sobald das erste Event angelegt wurde, erscheinen hier Termin, Verantwortlichkeiten und Aufgabenfortschritt."
                : "Für die gewählten Filter wurden keine Events gefunden. Passe die Auswahl an oder setze die Filter zurück."
            }
            title={
              data.totalEvents === 0
                ? "Noch keine Events vorhanden"
                : "Keine passenden Events"
            }
          />
        ) : (
          <>
            <div className="border-b border-slate-200 px-5 py-3">
              <p className="text-sm font-semibold text-slate-700">
                {data.filteredEvents.toLocaleString("de-DE")} passende von{" "}
                {data.totalEvents.toLocaleString("de-DE")} Events
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Format</th>
                    <th className="px-4 py-3">Event Lead</th>
                    <th className="px-4 py-3">Fortschritt</th>
                    <th className="px-4 py-3 text-right">Offen</th>
                    <th className="px-4 py-3 text-right">Überfällig</th>
                    <th className="px-5 py-3 text-right">Kritisch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.events.map((event) => (
                    <tr className="hover:bg-brand-50/40" key={event.id}>
                      <td className="px-5 py-4">
                        <Link
                          className="text-brand-900 hover:text-brand-700 font-bold"
                          href={`/events/${event.id}`}
                          prefetch={false}
                        >
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">
                        {formatDate(event.eventDate)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {event.format ?? "Nicht festgelegt"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {event.eventLead?.name ?? "Nicht zugewiesen"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-32 items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="bg-brand-700 h-full rounded-full"
                              style={{ width: `${event.metrics.progress}%` }}
                            />
                          </div>
                          <span className="w-10 text-right font-bold text-slate-700">
                            {event.metrics.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-700">
                        {event.metrics.openTasks}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={
                            event.metrics.overdueTasks > 0
                              ? "font-bold text-red-700"
                              : "text-slate-500"
                          }
                        >
                          {event.metrics.overdueTasks}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={
                            event.metrics.criticalOpenTasks > 0
                              ? "inline-flex min-w-7 justify-center rounded-full bg-red-50 px-2 py-1 font-bold text-red-700"
                              : "text-slate-500"
                          }
                        >
                          {event.metrics.criticalOpenTasks}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <PaginationControls
        basePath="/events"
        pagination={data.pagination}
        query={params}
      />
    </>
  );
}
