import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, StatusBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { formatNoShowRate } from "@/modules/evaluations/metrics";
import { getEventCockpitOverview } from "@/modules/events/queries";
import { getEventWorkspaceData } from "@/modules/events/workspace";
import {
  formatDate,
  formatEventDateTime,
  getPhaseLabel,
  getSafeExternalUrl,
  getTaskStatusPresentation,
} from "@/modules/events/presentation";
import { getTaskHref } from "@/modules/tasks/list-state";
import { createEventTemplateFromEventAction } from "./planning-actions";
import { RecalculateDueDatesForm } from "./recalculate-due-dates-form";

export const dynamic = "force-dynamic";
type SearchParams = Record<string, string | string[] | undefined>;
type EventCockpitOverview = NonNullable<
  Awaited<ReturnType<typeof getEventCockpitOverview>>
>;
type ReadinessAreaKey =
  EventCockpitOverview["readiness"]["missingAreas"][number]["key"];
function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function TemplateSaveMessage({ query }: { query: SearchParams }) {
  const result = firstValue(query.template);
  const templateId = firstValue(query.templateId);
  const taskCount = Number(firstValue(query.taskCount) ?? 0);

  if (!result) {
    return null;
  }

  const messages = {
    saved: {
      tone: "green",
      text: `${taskCount.toLocaleString("de-DE")} ${
        taskCount === 1 ? "Aufgabe wurde" : "Aufgaben wurden"
      } als offene Standardaufgaben in einer neuen Vorlage gespeichert.`,
    },
    duplicate: {
      tone: "red",
      text: "Dieser Vorlagenname wird bereits verwendet. Bitte wähle einen anderen Namen.",
    },
    empty: {
      tone: "red",
      text: "Für dieses Event sind noch keine Aufgaben vorhanden, aus denen eine Vorlage erstellt werden kann.",
    },
    invalid: {
      tone: "red",
      text: "Bitte gib einen Namen für die neue Vorlage ein.",
    },
    denied: {
      tone: "red",
      text: "Du hast keine Berechtigung, aus diesem Event eine Vorlage zu erstellen.",
    },
    failed: {
      tone: "red",
      text: "Die Vorlage konnte nicht erstellt werden. Bitte versuche es erneut.",
    },
  } as const;
  const message = messages[result as keyof typeof messages];

  if (!message) {
    return null;
  }

  return (
    <div
      className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
        message.tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
      role="status"
    >
      <strong>{message.text}</strong>
      {result === "saved" && templateId ? (
        <Link
          className="text-brand-700 ml-3 font-semibold hover:underline"
          href={`/settings/event-templates/${templateId}`}
        >
          Vorlage öffnen
        </Link>
      ) : null}
    </div>
  );
}

function ReadinessCard({
  eventId,
  readiness,
}: {
  eventId: string;
  readiness: EventCockpitOverview["readiness"];
}) {
  const toneClasses = {
    green: {
      score: "bg-emerald-50 text-emerald-800",
      bar: "bg-emerald-600",
    },
    blue: {
      score: "bg-blue-50 text-blue-800",
      bar: "bg-blue-600",
    },
    yellow: {
      score: "bg-amber-50 text-amber-900",
      bar: "bg-amber-500",
    },
    red: {
      score: "bg-red-50 text-red-800",
      bar: "bg-red-600",
    },
  };
  const tone = toneClasses[readiness.level.tone];
  const getAreaHref = (key: ReadinessAreaKey) =>
    key === "setup"
      ? `/events/${eventId}/edit`
      : `/events/${eventId}/tasks?readinessArea=${key}`;

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="grid lg:grid-cols-[260px_1fr]">
        <div className={`p-6 ${tone.score}`}>
          <p className="text-xs font-bold tracking-[0.14em] uppercase">
            Readiness Score
          </p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight">
              {readiness.score}
            </span>
            <span className="pb-1 text-sm font-semibold opacity-75">
              von 100
            </span>
          </div>
          <p className="mt-3 text-sm font-bold">{readiness.level.label}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className={`h-full rounded-full ${tone.bar}`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-brand-950 font-bold">
            Bereiche mit Punktverlust
          </h2>
          {readiness.missingAreas.length === 0 ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
              Alle Readiness-Kriterien sind erfüllt. Aktuell gehen keine Punkte
              verloren.
            </p>
          ) : (
            <ul className="mt-3 grid gap-3 xl:grid-cols-2">
              {readiness.missingAreas.map((area) => (
                <li key={area.key}>
                  <Link
                    className="group hover:border-brand-300 hover:bg-brand-50 block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition"
                    href={getAreaHref(area.key)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-slate-800">
                        {area.label}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-red-700">
                        -{area.maxPoints} Punkte
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {area.explanation}
                    </p>
                    <span className="text-brand-700 group-hover:text-brand-900 mt-2 inline-flex text-xs font-bold">
                      Bearbeiten
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function EvaluationCard({ event }: { event: EventCockpitOverview["event"] }) {
  const evaluation = event.evaluation;

  if (!evaluation) {
    return (
      <Card className="mt-6">
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-brand-950 font-bold">Evaluation & Wirkung</h2>
            <p className="text-muted mt-1 text-sm leading-6">
              Für dieses Event wurden noch keine Kennzahlen oder Learnings
              dokumentiert.
            </p>
          </div>
          <Link
            className="border-brand-300 text-brand-800 hover:bg-brand-50 inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold transition"
            href={`/events/${event.id}/evaluation`}
          >
            Evaluation beginnen
          </Link>
        </div>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Anmeldungen",
      value: evaluation.registrations?.toLocaleString("de-DE") ?? "–",
    },
    {
      label: "Teilnehmende",
      value: evaluation.attendees?.toLocaleString("de-DE") ?? "–",
    },
    {
      label: "No-Show-Quote",
      value: formatNoShowRate(evaluation.noShowRate),
    },
    {
      label: "Zielgruppenfit",
      value:
        evaluation.targetAudienceFit === null
          ? "–"
          : `${evaluation.targetAudienceFit} / 5`,
    },
    {
      label: "Zufriedenheit",
      value:
        evaluation.satisfaction === null
          ? "–"
          : `${evaluation.satisfaction.toLocaleString("de-DE")} / 5`,
    },
    {
      label: "NPS",
      value: evaluation.netPromoterScore?.toLocaleString("de-DE") ?? "–",
    },
  ];
  const learnings = [
    ["Qualitative Learnings", evaluation.qualitativeLearnings],
    ["Was lief gut?", evaluation.wentWell],
    ["Was war schwierig?", evaluation.wasDifficult],
    ["Beim nächsten Mal anders", evaluation.nextTimeDifferent],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-brand-950 font-bold">Evaluation & Wirkung</h2>
          <p className="text-muted mt-1 text-xs">
            Kennzahlen und Erkenntnisse aus der Nachbereitung
          </p>
        </div>
        <Link
          className="text-brand-700 text-sm font-semibold hover:underline"
          href={`/events/${event.id}/evaluation`}
        >
          Evaluation bearbeiten
        </Link>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1fr_1.4fr]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
          {metrics.map((metric) => (
            <div
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              key={metric.label}
            >
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                {metric.label}
              </p>
              <p className="text-brand-950 mt-2 text-xl font-bold">
                {metric.value}
              </p>
            </div>
          ))}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
              Wiederholen
            </p>
            <p className="text-brand-950 mt-2 text-xl font-bold">
              {evaluation.repeatEvent === null
                ? "Offen"
                : evaluation.repeatEvent
                  ? "Ja"
                  : "Nein"}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Gespeicherte Learnings
          </h3>
          {learnings.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Kennzahlen sind vorhanden, qualitative Learnings wurden aber noch
              nicht ergänzt.
            </p>
          ) : (
            <dl className="mt-3 grid gap-3">
              {learnings.map(([label, value]) => (
                <div
                  className="rounded-lg border border-slate-200 px-4 py-3"
                  key={label}
                >
                  <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1.5 text-sm leading-6 whitespace-pre-line text-slate-700">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </Card>
  );
}

function ParticipantCard({
  eventId,
  metrics,
}: {
  eventId: string;
  metrics: EventCockpitOverview["participantMetrics"];
}) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-brand-950 font-bold">Teilnehmermanagement</h2>
          <p className="text-muted mt-1 text-xs">
            Gepflegte Kontakte für dieses Event
          </p>
        </div>
        <Link
          className="text-brand-700 text-sm font-semibold hover:underline"
          href={`/events/${eventId}/participants`}
        >
          Teilnehmerliste öffnen
        </Link>
      </div>
      <div className="p-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
            Personen gesamt
          </p>
          <p className="text-brand-950 mt-2 text-2xl font-bold">
            {metrics.total.toLocaleString("de-DE")}
          </p>
        </div>
      </div>
    </Card>
  );
}

function DetailField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm leading-6 font-medium text-slate-800">
        {value || "Nicht hinterlegt"}
      </dd>
    </div>
  );
}

function SaveTemplateFromEventForm({
  eventId,
  eventTitle,
  taskCount,
}: {
  eventId: string;
  eventTitle: string;
  taskCount: number;
}) {
  const defaultName = `Vorlage aus ${eventTitle}`.slice(0, 120);
  const defaultDescription =
    `Aus dem Event "${eventTitle}" erstellt. Aufgaben werden beim nächsten Event offen angelegt.`.slice(
      0,
      1000,
    );

  return (
    <form action={createEventTemplateFromEventAction}>
      <input name="eventId" type="hidden" value={eventId} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">
          Name der Vorlage
        </span>
        <input
          className="focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none"
          defaultValue={defaultName}
          maxLength={120}
          name="name"
          required
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">
          Beschreibung
        </span>
        <textarea
          className="focus:border-brand-500 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none"
          defaultValue={defaultDescription}
          maxLength={1000}
          name="description"
          rows={3}
        />
      </label>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Übernimmt {taskCount.toLocaleString("de-DE")}{" "}
        {taskCount === 1 ? "Aufgabe" : "Aufgaben"} aus diesem Event. Status,
        Erledigungen und Synchronisationsdaten werden nicht übernommen.
      </p>
      <button
        className="bg-brand-900 hover:bg-brand-800 mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition"
        type="submit"
      >
        Als Vorlage speichern
      </button>
    </form>
  );
}

function PersonalTasks({
  eventId,
  tasks,
  empty,
}: {
  eventId: string;
  tasks: Awaited<ReturnType<typeof getEventWorkspaceData>>["myTasks"];
  empty: string;
}) {
  return tasks.length === 0 ? (
    <p className="px-5 py-4 text-sm text-slate-500">{empty}</p>
  ) : (
    <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
      {tasks.map((task) => {
        const status = getTaskStatusPresentation(task.status);
        return (
          <li key={task.id} className="px-5 py-3">
            <Link
              className="text-brand-950 font-semibold hover:underline"
              href={getTaskHref(eventId, task.id, "/events/" + eventId)}
            >
              {task.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                {getPhaseLabel(task.phase)} · Fällig: {formatDate(task.dueDate)}
              </span>
              <StatusBadge color={status.color}>{status.label}</StatusBadge>
              {task.isCritical ? (
                <StatusBadge color="red">Kritisch</StatusBadge>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function EventCockpitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [cockpit, currentUser, workspace] = await Promise.all([
    getEventCockpitOverview(id),
    getCurrentUser(),
    getEventWorkspaceData(id),
  ]);
  if (!cockpit) notFound();
  const { event, metrics, participantMetrics, readiness, taskSummary } =
    cockpit;
  const canManageEvents = hasPermission(currentUser, Permission.MANAGE_EVENTS);
  const planningResult =
    firstValue(query.planning) === "recalculated"
      ? {
          updated: Number(firstValue(query.updated) ?? 0),
          skipped: Number(firstValue(query.skipped) ?? 0),
          withoutOffset: Number(firstValue(query.withoutOffset) ?? 0),
        }
      : null;
  const links = [
    ["Eventlink", event.registrationUrl],
    ["Feedbackformular", event.feedbackFormUrl],
  ]
    .map(([label, value]) => ({ label, href: getSafeExternalUrl(value) }))
    .filter(
      (link): link is { label: string; href: string } => link.href !== null,
    );
  const sections = [
    ["Aufgaben", "/tasks"],
    ["Kommunikation", "/communications"],
    ["Teilnehmende", "/participants"],
    ["Evaluation", "/evaluation"],
  ];
  return (
    <>
      <Link
        className="text-brand-700 mb-4 inline-block text-sm font-semibold hover:underline"
        href="/events"
      >
        ← Eventliste
      </Link>
      <Card className="mb-6 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {event.format ?? "Format offen"}
            </p>
            <h1 className="text-brand-950 mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {event.title}
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              {formatEventDateTime(
                event.eventDate,
                event.startTime,
                event.endTime,
              )}{" "}
              · {event.location ?? "Ort offen"}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Lead: {event.eventLead?.name ?? "Offen"} · Co-Lead:{" "}
              {event.coLead?.name ?? "Offen"} · Kommunikation:{" "}
              {event.communicationOwner?.name ?? "Offen"}
            </p>
          </div>
          {canManageEvents ? (
            <Link
              className="text-brand-700 flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
              href={"/events/" + id + "/edit"}
              aria-label="Event-Stammdaten bearbeiten"
              title="Event-Stammdaten bearbeiten"
            >
              <span aria-hidden="true">↗</span>
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 px-5 py-3 text-sm">
          <strong>
            {metrics.totalTasks === 0
              ? "Noch keine Aufgaben"
              : metrics.progress + "% abgeschlossen"}
          </strong>
          <Link
            className="hover:underline"
            href={"/events/" + id + "/tasks?openOnly=true"}
          >
            {metrics.openTasks} offene Aufgaben
          </Link>
          <Link
            className="text-red-700 hover:underline"
            href={"/events/" + id + "/tasks?due=overdue"}
          >
            {metrics.overdueTasks} überfällig
          </Link>
          <Link
            className="hover:underline"
            href={"/events/" + id + "/tasks?critical=true&openOnly=true"}
          >
            {metrics.criticalOpenTasks} kritisch und offen
          </Link>
        </div>
        <nav
          aria-label="Eventbereiche"
          className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3"
        >
          {sections.map(([label, path]) => (
            <Link
              key={path}
              className="text-brand-800 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100"
              href={"/events/" + id + path}
            >
              {label}
            </Link>
          ))}
        </nav>
      </Card>
      {planningResult ? (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <strong>{planningResult.updated} Fälligkeiten aktualisiert.</strong>{" "}
          {planningResult.skipped} manuelle Termine geschützt;{" "}
          {planningResult.withoutOffset} Aufgaben ohne Offset unverändert.
        </div>
      ) : null}
      <TemplateSaveMessage query={query} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Mein Arbeitsbereich</h2>
            <p className="mt-1 text-xs text-slate-500">
              Aufgaben und Prüfungen für {currentUser.name}
            </p>
          </div>
          <h3 className="bg-slate-50 px-5 py-2 text-sm font-semibold">
            Meine offenen Aufgaben ({workspace.myTasks.length})
          </h3>
          <PersonalTasks
            eventId={id}
            tasks={workspace.myTasks}
            empty="Du hast hier keine offenen Aufgaben."
          />
          <h3 className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-sm font-semibold">
            Meine ausstehenden Prüfungen ({workspace.myReviews.length})
          </h3>
          <p className="px-5 pt-3 text-xs text-slate-500">
            Noch nicht freigegebene Aufgaben, denen du als Prüfer zugeordnet
            bist.
          </p>
          <PersonalTasks
            eventId={id}
            tasks={workspace.myReviews}
            empty="Für dich stehen keine Prüfungen aus."
          />
        </Card>
        <Card className="p-5">
          <h2 className="text-brand-950 font-bold">Fortschritt je Phase</h2>
          <p className="mt-1 text-xs text-slate-500">
            Erledigte und entfallene Aufgaben zählen als abgeschlossen.
          </p>
          <div className="mt-5 space-y-5">
            {workspace.phases.map((phase) => (
              <div key={phase.phase}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <Link
                    className="font-semibold hover:underline"
                    href={"/events/" + id + "/tasks?phase=" + phase.phase}
                  >
                    {getPhaseLabel(phase.phase)}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {phase.total === 0
                      ? "Noch keine Aufgaben"
                      : phase.completed +
                        " / " +
                        phase.total +
                        " · " +
                        phase.progress +
                        "%"}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={getPhaseLabel(phase.phase)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={phase.progress}
                  aria-valuetext={
                    phase.total === 0
                      ? "Noch keine Aufgaben"
                      : phase.completed +
                        " von " +
                        phase.total +
                        " Aufgaben abgeschlossen"
                  }
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className="bg-brand-700 h-full rounded-full"
                    style={{ width: phase.progress + "%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6 space-y-4">
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Veranstaltungsbereitschaft: {readiness.score} / 100 ·{" "}
            {readiness.level.label}
          </summary>
          <div className="px-4 pb-1">
            <ReadinessCard eventId={id} readiness={readiness} />
          </div>
        </details>
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Stammdaten & zentrale Links
          </summary>
          <dl className="grid gap-5 border-t border-slate-200 p-5 sm:grid-cols-2">
            <DetailField
              label="Beschreibung"
              value={event.description}
              className="sm:col-span-2"
            />
            <DetailField label="Zielgruppe" value={event.targetAudience} />
            <DetailField
              label="Ziele und gewünschtes Ergebnis"
              value={event.goal}
            />
          </dl>
          <div className="flex flex-wrap gap-3 px-5 pb-5">
            {links.length === 0 ? (
              <p className="text-sm text-slate-500">
                Keine zentralen Links hinterlegt.
              </p>
            ) : (
              links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 text-sm font-semibold hover:underline"
                >
                  {link.label} ↗
                </a>
              ))
            )}
          </div>
        </details>
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
            Teilnehmende ({participantMetrics.total}) & Evaluation
          </summary>
          <div className="px-4 pb-4">
            <ParticipantCard eventId={id} metrics={participantMetrics} />
            <EvaluationCard event={event} />
          </div>
        </details>
        {canManageEvents ? (
          <details
            className="rounded-xl border border-slate-200 bg-white"
            open={
              planningResult || firstValue(query.template) ? true : undefined
            }
          >
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
              Planungswerkzeuge & Eventverwaltung
            </summary>
            <div className="grid gap-6 border-t border-slate-200 p-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 font-semibold">
                  Fälligkeiten neu berechnen
                </h3>
                {taskSummary.tasksWithOffset > 0 ? (
                  <RecalculateDueDatesForm
                    eventId={id}
                    manualOverrideCount={taskSummary.manualOverrideCount}
                    tasksWithOffset={taskSummary.tasksWithOffset}
                  />
                ) : (
                  <p className="text-sm text-slate-500">
                    Keine Aufgaben mit hinterlegtem Offset vorhanden.
                  </p>
                )}
              </div>
              <div>
                <h3 className="mb-3 font-semibold">Vorlage aus diesem Event</h3>
                <SaveTemplateFromEventForm
                  eventId={id}
                  eventTitle={event.title}
                  taskCount={taskSummary.taskCount}
                />
              </div>
            </div>
            <div className="px-5 pb-5">
              <Link
                className="text-sm font-semibold text-red-700 hover:underline"
                href={"/events/" + id + "/edit?section=delete#event-loeschen"}
              >
                Event löschen …
              </Link>
            </div>
          </details>
        ) : null}
      </div>
    </>
  );
}
