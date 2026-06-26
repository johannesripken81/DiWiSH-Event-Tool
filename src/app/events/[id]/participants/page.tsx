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
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getParticipantList } from "@/modules/participants/queries";
import {
  followUpStatusLabels,
  getFollowUpStatusColor,
  getParticipantStatusColor,
  participantRatingLabels,
  participantStatusLabels,
  participantTargetGroupLabels,
} from "@/modules/participants/presentation";

import { DeleteParticipantForm } from "./delete-participant-form";
import { updateParticipantQuickAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPage(value: string | string[] | undefined) {
  const page = Number(firstValue(value) ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function QuickParticipantAction({
  action,
  children,
  eventId,
  participantId,
}: {
  action: string;
  children: React.ReactNode;
  eventId: string;
  participantId: string;
}) {
  return (
    <form action={updateParticipantQuickAction}>
      <input name="eventId" type="hidden" value={eventId} />
      <input name="participantId" type="hidden" value={participantId} />
      <input name="action" type="hidden" value={action} />
      <button
        className="inline-flex min-h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        type="submit"
      >
        {children}
      </button>
    </form>
  );
}

function ImportResult({ query }: { query: SearchParams }) {
  const imported = Number(firstValue(query.imported) ?? 0);
  const updated = Number(firstValue(query.updated) ?? 0);
  const skipped = Number(firstValue(query.skipped) ?? 0);
  const importError = firstValue(query.import);

  if (importError === "missing-file") {
    return (
      <div
        className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        role="alert"
      >
        Bitte wähle eine CSV-Datei aus.
      </div>
    );
  }

  if (importError === "empty") {
    return (
      <div
        className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
        role="alert"
      >
        In der CSV-Datei wurden keine importierbaren Personen gefunden.
      </div>
    );
  }

  if (importError === "file-too-large") {
    return (
      <div
        className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        role="alert"
      >
        Die CSV-Datei ist zu groß. Bitte maximal 1 MB hochladen.
      </div>
    );
  }

  if (imported === 0 && updated === 0 && skipped === 0) {
    return null;
  }

  return (
    <div
      className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
      role="status"
    >
      CSV-Import abgeschlossen: {imported} neu angelegt, {updated} aktualisiert,
      {skipped} übersprungen.
    </div>
  );
}

export default async function ParticipantListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getParticipantList(id, getPage(query.page));
  const currentUser = await getCurrentUser();

  if (!data.event) {
    notFound();
  }

  const event = data.event;
  const canManageParticipants = hasPermission(
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
          canManageParticipants ? (
            <div className="flex flex-wrap gap-2">
              <Link
                className="border-brand-300 text-brand-800 hover:bg-brand-50 inline-flex min-h-10 items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold transition"
                href={`/events/${event.id}/participants/import`}
              >
                CSV importieren
              </Link>
              <PrimaryLink href={`/events/${event.id}/participants/new`}>
                Person anlegen
              </PrimaryLink>
            </div>
          ) : undefined
        }
        description={`Kontaktliste für „${event.title}“ pflegen.`}
        eyebrow="Event-Teilnehmende"
        title="Teilnehmermanagement"
      />

      <ImportResult query={query} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Personen gesamt
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {data.metrics.total}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Registriert
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {data.metrics.registered}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Teilgenommen
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {data.metrics.attended}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Follow-ups
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {data.metrics.followUps}
          </p>
        </Card>
      </div>

      <Card>
        {data.participants.length === 0 ? (
          <EmptyState
            action={
              canManageParticipants ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <PrimaryLink href={`/events/${event.id}/participants/new`}>
                    Erste Person anlegen
                  </PrimaryLink>
                  <Link
                    className="border-brand-300 text-brand-800 hover:bg-brand-50 inline-flex min-h-10 items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold transition"
                    href={`/events/${event.id}/participants/import`}
                  >
                    CSV importieren
                  </Link>
                </div>
              ) : undefined
            }
            description="Für dieses Event sind noch keine Personen angelegt."
            title="Keine Personen gefunden"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-4 py-3">Zielgruppe</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Signale</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-5 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.participants.map((participant) => (
                  <tr className="hover:bg-slate-50/80" key={participant.id}>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">
                        {participant.name}
                      </p>
                      <a
                        className="text-brand-700 mt-1 inline-flex text-xs font-semibold hover:underline"
                        href={`mailto:${participant.email}`}
                      >
                        {participant.email}
                      </a>
                      <p className="mt-1 text-xs text-slate-500">
                        {participant.organization ?? "Organisation offen"}
                        {participant.role ? ` · ${participant.role}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {
                        participantTargetGroupLabels[
                          participant.targetGroupType
                        ]
                      }
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        color={getParticipantStatusColor(participant.status)}
                      >
                        {participantStatusLabels[participant.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {participant.personallyInvited ? (
                          <StatusBadge color="blue">Persönlich</StatusBadge>
                        ) : null}
                        {participant.registered ? (
                          <StatusBadge color="green">Registriert</StatusBadge>
                        ) : null}
                        {participant.attended ? (
                          <StatusBadge color="green">Vor Ort</StatusBadge>
                        ) : null}
                        {participant.noShowRisk === "HIGH" ? (
                          <StatusBadge color="yellow">
                            No-Show:{" "}
                            {participantRatingLabels[participant.noShowRisk]}
                          </StatusBadge>
                        ) : null}
                        {participant.matchmakingPotential === "HIGH" ? (
                          <StatusBadge color="blue">
                            Matchmaking:{" "}
                            {
                              participantRatingLabels[
                                participant.matchmakingPotential
                              ]
                            }
                          </StatusBadge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        color={getFollowUpStatusColor(
                          participant.followUpStatus,
                        )}
                      >
                        {participant.followUpNeeded
                          ? followUpStatusLabels[participant.followUpStatus]
                          : "Nicht nötig"}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-4">
                      {canManageParticipants ? (
                        <div className="flex justify-end gap-2">
                          <Link
                            className="inline-flex min-h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            href={`/events/${event.id}/participants/${participant.id}/edit`}
                          >
                            Bearbeiten
                          </Link>
                          {!participant.registered ? (
                            <QuickParticipantAction
                              action="markRegistered"
                              eventId={event.id}
                              participantId={participant.id}
                            >
                              Registriert
                            </QuickParticipantAction>
                          ) : null}
                          {participant.registered && !participant.attended ? (
                            <QuickParticipantAction
                              action="markAttended"
                              eventId={event.id}
                              participantId={participant.id}
                            >
                              Vor Ort
                            </QuickParticipantAction>
                          ) : null}
                          <QuickParticipantAction
                            action={
                              participant.followUpNeeded
                                ? "clearFollowUp"
                                : "markFollowUpNeeded"
                            }
                            eventId={event.id}
                            participantId={participant.id}
                          >
                            {participant.followUpNeeded
                              ? "Kein Follow-up"
                              : "Follow-up"}
                          </QuickParticipantAction>
                          <DeleteParticipantForm
                            eventId={event.id}
                            participantId={participant.id}
                            participantName={participant.name}
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

      <PaginationControls
        basePath={`/events/${event.id}/participants`}
        pagination={data.pagination}
        query={query}
      />
    </>
  );
}
