import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui";
import {
  formatDate,
  formatEventDateTime,
  formatTime,
} from "@/modules/events/presentation";
import { getRunOfShow } from "@/modules/run-of-show/queries";
import { getRunOfShowDurationMinutes } from "@/modules/run-of-show/schedule";

import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function InfoBlock({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | null;
  tone?: "neutral" | "risk" | "note";
}) {
  if (!value) {
    return null;
  }

  const tones = {
    neutral: "border-slate-200 bg-white text-slate-800",
    risk: "border-red-200 bg-red-50 text-red-900",
    note: "border-blue-200 bg-blue-50 text-blue-950",
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <p className="text-[11px] font-bold tracking-wide uppercase opacity-65">
        {label}
      </p>
      <p className="mt-1 text-sm leading-5 font-medium whitespace-pre-line">
        {value}
      </p>
    </div>
  );
}

export default async function EventDayRunOfShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getRunOfShow(id);

  if (!event) {
    notFound();
  }

  return (
    <div className="event-day-view">
      <div className="print-hidden mb-5 flex flex-col justify-between gap-3 sm:flex-row">
        <Link
          className="text-brand-700 hover:text-brand-950 inline-flex items-center text-sm font-semibold"
          href={`/events/${event.id}/run-of-show`}
        >
          ← Zurück zur Pflegeansicht
        </Link>
        <PrintButton />
      </div>

      <header className="event-day-header bg-brand-950 rounded-2xl px-6 py-6 text-white sm:px-8">
        <p className="text-brand-200 text-xs font-bold tracking-[0.18em] uppercase">
          Ablauf & Regieplan
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {event.title}
        </h1>
        <div className="text-brand-100 mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <span>
            {formatEventDateTime(
              event.eventDate,
              event.startTime,
              event.endTime,
            )}
          </span>
          {event.location ? <span>{event.location}</span> : null}
          <span>{event.runOfShowItems.length} Programmpunkte</span>
        </div>
      </header>

      {event.runOfShowItems.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
          <EmptyState
            description="Für den Eventtag sind noch keine Programmpunkte angelegt."
            title="Regieplan ist noch leer"
          />
        </div>
      ) : (
        <div className="event-day-schedule mt-6 space-y-4">
          {event.runOfShowItems.map((item, index) => (
            <article
              className="event-day-item grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[170px_1fr]"
              key={item.id}
            >
              <div className="bg-brand-50 border-b border-slate-200 p-5 lg:border-r lg:border-b-0">
                <p className="text-brand-950 text-2xl font-bold">
                  {formatTime(item.startTime)}
                </p>
                <p className="text-brand-700 mt-1 text-sm font-bold">
                  bis {formatTime(item.endTime)}
                </p>
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  {getRunOfShowDurationMinutes(item)} Minuten
                </p>
                <p className="mt-4 text-xs font-bold tracking-wide text-slate-400 uppercase">
                  #{index + 1}
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <h2 className="text-brand-950 text-xl font-bold">
                    {item.programItem}
                  </h2>
                  <span className="bg-brand-900 inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold text-white">
                    {item.responsibleUser?.name ?? "Nicht zugewiesen"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <InfoBlock label="Ziel" value={item.goal} />
                  <InfoBlock label="Methode" value={item.method} />
                  <InfoBlock label="Material" value={item.material} />
                  <InfoBlock label="Risiko" tone="risk" value={item.risk} />
                  <div className="md:col-span-2">
                    <InfoBlock
                      label="Übergang / Moderationshinweis"
                      tone="note"
                      value={item.transitionNote}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="event-day-footer mt-6 hidden border-t border-slate-300 pt-3 text-xs text-slate-500">
        {event.title} · {formatDate(event.eventDate)} · DIWISH Event Operations
      </footer>
    </div>
  );
}
