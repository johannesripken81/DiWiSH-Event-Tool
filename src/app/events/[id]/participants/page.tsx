import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  EmptyState,
  PageHeader,
  PrimaryLink,
  StatusBadge,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { formatNoShowRate } from "@/modules/evaluations/metrics";
import {
  getFollowUpPresentation,
  getMatchmakingPresentation,
  getNoShowRiskPresentation,
  getParticipantStatusPresentation,
  getParticipantTargetGroupLabel,
  participantStatusOptions,
  participantTargetGroupOptions,
} from "@/modules/participants/presentation";
import {
  getParticipantList,
  isParticipantFollowUpFilter,
  isParticipantStatus,
  isParticipantTargetGroup,
  type ParticipantFilters,
} from "@/modules/participants/queries";

import { DeleteParticipantForm } from "./delete-participant-form";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function BooleanBadge({ value }: { value: boolean }) {
  return (
    <StatusBadge color={value ? "green" : "gray"}>
      {value ? "Ja" : "Nein"}
    </StatusBadge>
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
  const targetGroupValue = firstValue(query.targetGroupType);
  const statusValue = firstValue(query.status);
  const followUpValue = firstValue(query.followUp);
  const filters: ParticipantFilters = {
    targetGroupType: isParticipantTargetGroup(targetGroupValue)
      ? targetGroupValue
      : undefined,
    status: isParticipantStatus(statusValue) ? statusValue : undefined,
    followUp: isParticipantFollowUpFilter(followUpValue)
      ? followUpValue
      : "all",
  };
  const data = await getParticipantList(id, filters);
  const currentUser = await getCurrentUser();

  if (!data.event) {
    notFound();
  }

  const event = data.event;
  const canManageParticipants = hasPermission(
    currentUser,
    Permission.MANAGE_EVENT_OPERATIONS,
  );
  const hasFilters = Boolean(
    filters.targetGroupType || filters.status || filters.followUp !== "all",
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
            <PrimaryLink href={`/events/${event.id}/participants/new`}>
              Person anlegen
            </PrimaryLink>
          ) : undefined
        }
        description={`Einladungen, Teilnahme, Interessen und Follow-ups für „${event.title}“ pflegen.`}
        eyebrow="Event-Teilnehmende"
        title="Teilnehmermanagement"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">Gesamt</p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {data.metrics.total}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Angemeldet
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {data.metrics.registered}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Teilgenommen
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {data.metrics.attended}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            No-Show-Quote
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            {formatNoShowRate(data.metrics.noShowRate)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Follow-ups offen
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              data.metrics.openFollowUps > 0
                ? "text-red-700"
                : "text-emerald-700"
            }`}
          >
            {data.metrics.openFollowUps}
          </p>
        </Card>
      </div>

      <Card className="mb-5">
        <form
          className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_1fr_auto]"
          method="get"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Zielgruppentyp
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.targetGroupType ?? ""}
              name="targetGroupType"
            >
              <option value="">Alle Zielgruppen</option>
              {participantTargetGroupOptions.map((targetGroup) => (
                <option key={targetGroup} value={targetGroup}>
                  {getParticipantTargetGroupLabel(targetGroup)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Status
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.status ?? ""}
              name="status"
            >
              <option value="">Alle Status</option>
              {participantStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {getParticipantStatusPresentation(status).label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Follow-up
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.followUp}
              name="followUp"
            >
              <option value="all">Alle</option>
              <option value="open">Offen</option>
              <option value="completed">Erledigt</option>
              <option value="not-required">Nicht erforderlich</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              className="bg-brand-900 hover:bg-brand-800 min-h-10 rounded-lg px-5 text-sm font-semibold text-white"
              type="submit"
            >
              Filtern
            </button>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              href={`/events/${event.id}/participants`}
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        {data.participants.length === 0 ? (
          <EmptyState
            action={
              hasFilters ? (
                <Link
                  className="text-brand-700 text-sm font-semibold hover:underline"
                  href={`/events/${event.id}/participants`}
                >
                  Filter zurücksetzen
                </Link>
              ) : canManageParticipants ? (
                <PrimaryLink href={`/events/${event.id}/participants/new`}>
                  Erste Person anlegen
                </PrimaryLink>
              ) : undefined
            }
            description={
              hasFilters
                ? "Für die gewählten Filter wurden keine Personen gefunden."
                : "Für dieses Event sind noch keine Teilnehmenden angelegt."
            }
            title="Keine Personen gefunden"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-4 py-3">Organisation / Rolle</th>
                  <th className="px-4 py-3">Zielgruppe</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Persönlich eingeladen</th>
                  <th className="px-4 py-3">Angemeldet</th>
                  <th className="px-4 py-3">Teilgenommen</th>
                  <th className="px-4 py-3">No-Show-Risiko</th>
                  <th className="px-4 py-3">Interesse/Thema</th>
                  <th className="px-4 py-3">Matchmaking</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-5 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.participants.map((participant) => {
                  const status = getParticipantStatusPresentation(
                    participant.status,
                  );
                  const noShowRisk = getNoShowRiskPresentation(
                    participant.noShowRisk,
                  );
                  const matchmaking = getMatchmakingPresentation(
                    participant.matchmakingPotential,
                  );
                  const followUp = getFollowUpPresentation(
                    participant.followUpStatus,
                  );

                  return (
                    <tr className="hover:bg-slate-50/80" key={participant.id}>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">
                          {participant.name}
                        </p>
                        <a
                          className="text-brand-700 mt-1 block text-xs hover:underline"
                          href={`mailto:${participant.email}`}
                        >
                          {participant.email}
                        </a>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p>{participant.organization ?? "Nicht hinterlegt"}</p>
                        {participant.role ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {participant.role}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {getParticipantTargetGroupLabel(
                          participant.targetGroupType,
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge color={status.color}>
                          {status.label}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-4">
                        <BooleanBadge value={participant.personallyInvited} />
                      </td>
                      <td className="px-4 py-4">
                        <BooleanBadge value={participant.registered} />
                      </td>
                      <td className="px-4 py-4">
                        <BooleanBadge value={participant.attended} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge color={noShowRisk.color}>
                          {noShowRisk.label}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-64 whitespace-pre-line text-slate-600">
                          {participant.interestTopic ?? "Nicht hinterlegt"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge color={matchmaking.color}>
                          {matchmaking.label}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge color={followUp.color}>
                          {followUp.label}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
