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
import {
  getTodayUtc,
  isCommunicationMeasureOverdue,
} from "@/modules/communications/metrics";
import {
  communicationApprovalStatusOptions,
  communicationChannelOptions,
  getCommunicationApprovalPresentation,
  getCommunicationChannelLabel,
  getSafeAssetUrl,
} from "@/modules/communications/presentation";
import {
  getCommunicationPlan,
  isCommunicationApprovalStatus,
  isCommunicationChannel,
  type CommunicationFilters,
} from "@/modules/communications/queries";
import { formatDate } from "@/modules/events/presentation";

import { DeleteMeasureForm } from "./delete-measure-form";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CommunicationPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const channelValue = firstValue(query.channel);
  const approvalStatusValue = firstValue(query.approvalStatus);
  const filters: CommunicationFilters = {
    channel: isCommunicationChannel(channelValue) ? channelValue : undefined,
    approvalStatus: isCommunicationApprovalStatus(approvalStatusValue)
      ? approvalStatusValue
      : undefined,
  };
  const plan = await getCommunicationPlan(id, filters);
  const currentUser = await getCurrentUser();

  if (!plan.event) {
    notFound();
  }

  const event = plan.event;
  const canManageCommunication = hasPermission(
    currentUser,
    Permission.MANAGE_COMMUNICATION,
  );
  const today = getTodayUtc();
  const hasFilters = Boolean(filters.channel || filters.approvalStatus);
  const overdueCount = plan.measures.filter((measure) =>
    isCommunicationMeasureOverdue(measure, today),
  ).length;

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
          canManageCommunication ? (
            <PrimaryLink href={`/events/${event.id}/communications/new`}>
              Maßnahme anlegen
            </PrimaryLink>
          ) : undefined
        }
        description={`Kanäle, Botschaften, Freigaben und Wirkung für „${event.title}“ steuern.`}
        eyebrow="Event-Kommunikation"
        title="Kommunikationsplan"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Maßnahmen gesamt
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {plan.totalMeasures}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Gefilterte Ansicht
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {plan.measures.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Überfällig
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              overdueCount > 0 ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {overdueCount}
          </p>
        </Card>
      </div>

      <Card className="mb-5">
        <form
          className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto]"
          method="get"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Kanal
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.channel ?? ""}
              name="channel"
            >
              <option value="">Alle Kanäle</option>
              {communicationChannelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {getCommunicationChannelLabel(channel)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Freigabestatus
            </span>
            <select
              className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              defaultValue={filters.approvalStatus ?? ""}
              name="approvalStatus"
            >
              <option value="">Alle Status</option>
              {communicationApprovalStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {getCommunicationApprovalPresentation(status).label}
                </option>
              ))}
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
              href={`/events/${event.id}/communications`}
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        {plan.measures.length === 0 ? (
          <EmptyState
            action={
              hasFilters ? (
                <Link
                  className="text-brand-700 text-sm font-semibold hover:underline"
                  href={`/events/${event.id}/communications`}
                >
                  Filter zurücksetzen
                </Link>
              ) : canManageCommunication ? (
                <PrimaryLink href={`/events/${event.id}/communications/new`}>
                  Erste Maßnahme anlegen
                </PrimaryLink>
              ) : undefined
            }
            description={
              hasFilters
                ? "Für die gewählten Filter wurden keine Kommunikationsmaßnahmen gefunden."
                : "Für dieses Event sind noch keine Kommunikationsmaßnahmen angelegt."
            }
            title="Keine Maßnahmen gefunden"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1750px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Kanal</th>
                  <th className="px-4 py-3">Zielgruppe</th>
                  <th className="px-4 py-3">Botschaft</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Verantwortlich</th>
                  <th className="px-4 py-3">Veröffentlichung</th>
                  <th className="px-4 py-3">Freigabe</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3 text-right">Klicks</th>
                  <th className="px-4 py-3 text-right">Anmeldungen</th>
                  <th className="px-4 py-3 text-right">Reichweite</th>
                  <th className="px-4 py-3">Kommentare</th>
                  <th className="px-5 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan.measures.map((measure) => {
                  const approval = getCommunicationApprovalPresentation(
                    measure.approvalStatus,
                  );
                  const assetUrl = getSafeAssetUrl(measure.assetUrl);
                  const overdue = isCommunicationMeasureOverdue(measure, today);

                  return (
                    <tr
                      className={
                        overdue ? "bg-red-50/80" : "hover:bg-slate-50/80"
                      }
                      key={measure.id}
                    >
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {getCommunicationChannelLabel(measure.channel)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-52 text-slate-700">
                          {measure.targetAudience}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-72 text-slate-700">
                          {measure.message}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {measure.format}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {measure.responsibleUser?.name ?? "Nicht zugewiesen"}
                      </td>
                      <td
                        className={`px-4 py-4 font-semibold ${
                          overdue ? "text-red-800" : "text-slate-700"
                        }`}
                      >
                        {formatDate(measure.publicationDate)}
                        {overdue ? (
                          <span className="mt-1 block text-xs">
                            Überfällig, noch nicht freigegeben
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge color={approval.color}>
                          {approval.label}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-4">
                        {assetUrl ? (
                          <a
                            className="text-brand-700 font-semibold hover:underline"
                            href={assetUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Öffnen ↗
                          </a>
                        ) : (
                          <span className="text-slate-500">
                            Nicht hinterlegt
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">
                        {measure.clicks.toLocaleString("de-DE")}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">
                        {measure.registrations.toLocaleString("de-DE")}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">
                        {measure.reach.toLocaleString("de-DE")}
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-64 text-slate-600">
                          {measure.comments ?? "Keine Kommentare"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {canManageCommunication ? (
                          <div className="flex justify-end gap-2">
                            <Link
                              className="inline-flex min-h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              href={`/events/${event.id}/communications/${measure.id}/edit`}
                            >
                              Bearbeiten
                            </Link>
                            <DeleteMeasureForm
                              eventId={event.id}
                              measureId={measure.id}
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
