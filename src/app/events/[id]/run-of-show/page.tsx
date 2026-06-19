import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, EmptyState, PageHeader, PrimaryLink } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatDate,
  formatEventDateTime,
  formatTime,
} from "@/modules/events/presentation";
import { getRunOfShow } from "@/modules/run-of-show/queries";
import { getRunOfShowDurationMinutes } from "@/modules/run-of-show/schedule";

import { DeleteRunOfShowItemForm } from "./delete-item-form";

export const dynamic = "force-dynamic";

function OptionalText({ value }: { value: string | null }) {
  return value ? (
    <p className="max-w-72 whitespace-pre-line text-slate-700">{value}</p>
  ) : (
    <span className="text-slate-400">–</span>
  );
}

export default async function RunOfShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getRunOfShow(id);
  const currentUser = await getCurrentUser();

  if (!event) {
    notFound();
  }

  const canManageRunOfShow = hasPermission(
    currentUser,
    Permission.MANAGE_EVENT_OPERATIONS,
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="border-brand-300 text-brand-800 hover:bg-brand-50 inline-flex min-h-10 items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold transition"
              href={`/events/${event.id}/run-of-show/event-day`}
            >
              Eventtag-Ansicht
            </Link>
            {canManageRunOfShow ? (
              <PrimaryLink href={`/events/${event.id}/run-of-show/new`}>
                Programmpunkt anlegen
              </PrimaryLink>
            ) : null}
          </div>
        }
        description={`Chronologischer Ablauf, Zuständigkeiten und Regiehinweise für „${event.title}“.`}
        eyebrow="Ablauf & Regie"
        title="Regieplan"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Eventdatum
          </p>
          <p className="text-brand-950 mt-2 font-bold">
            {formatDate(event.eventDate)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Eventzeit
          </p>
          <p className="text-brand-950 mt-2 font-bold">
            {formatEventDateTime(
              event.eventDate,
              event.startTime,
              event.endTime,
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Programmpunkte
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {event.runOfShowItems.length}
          </p>
        </Card>
      </div>

      <Card>
        {event.runOfShowItems.length === 0 ? (
          <EmptyState
            action={
              canManageRunOfShow ? (
                <PrimaryLink href={`/events/${event.id}/run-of-show/new`}>
                  Ersten Programmpunkt anlegen
                </PrimaryLink>
              ) : undefined
            }
            description="Für dieses Event sind noch keine Programmpunkte im Regieplan angelegt."
            title="Regieplan ist noch leer"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1550px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Zeit</th>
                  <th className="px-4 py-3">Programmpunkt</th>
                  <th className="px-4 py-3">Ziel</th>
                  <th className="px-4 py-3">Methode</th>
                  <th className="px-4 py-3">Verantwortlich</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Risiko</th>
                  <th className="px-4 py-3">Übergang / Moderation</th>
                  <th className="px-5 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {event.runOfShowItems.map((item) => (
                  <tr className="align-top hover:bg-slate-50/80" key={item.id}>
                    <td className="px-5 py-4">
                      <p className="text-brand-950 font-bold whitespace-nowrap">
                        {formatTime(item.startTime)}–{formatTime(item.endTime)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getRunOfShowDurationMinutes(item)} Min.
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {canManageRunOfShow ? (
                        <Link
                          className="text-brand-950 hover:text-brand-700 max-w-64 font-bold"
                          href={`/events/${event.id}/run-of-show/${item.id}/edit`}
                        >
                          {item.programItem}
                        </Link>
                      ) : (
                        <span className="text-brand-950 max-w-64 font-bold">
                          {item.programItem}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <OptionalText value={item.goal} />
                    </td>
                    <td className="px-4 py-4">
                      <OptionalText value={item.method} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {item.responsibleUser?.name ?? "Nicht zugewiesen"}
                    </td>
                    <td className="px-4 py-4">
                      <OptionalText value={item.material} />
                    </td>
                    <td className="px-4 py-4">
                      {item.risk ? (
                        <p className="max-w-72 rounded-lg bg-red-50 px-3 py-2 whitespace-pre-line text-red-800">
                          {item.risk}
                        </p>
                      ) : (
                        <span className="text-slate-400">–</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {item.transitionNote ? (
                        <p className="max-w-80 rounded-lg bg-blue-50 px-3 py-2 whitespace-pre-line text-blue-900">
                          {item.transitionNote}
                        </p>
                      ) : (
                        <span className="text-slate-400">–</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {canManageRunOfShow ? (
                        <div className="flex justify-end gap-2">
                          <Link
                            className="inline-flex min-h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            href={`/events/${event.id}/run-of-show/${item.id}/edit`}
                          >
                            Bearbeiten
                          </Link>
                          <DeleteRunOfShowItemForm
                            eventId={event.id}
                            itemId={item.id}
                          />
                        </div>
                      ) : (
                        <span className="block text-right text-xs text-slate-500">
                          Nur Lesen
                        </span>
                      )}
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
