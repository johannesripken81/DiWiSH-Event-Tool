import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { formatNoShowRate } from "@/modules/evaluations/metrics";
import {
  getAuditActionLabel,
  getAuditChanges,
} from "@/modules/audit/presentation";
import { getEventCockpit } from "@/modules/events/queries";
import {
  formatDate,
  formatEventDateTime,
  getPhaseLabel,
  getSafeExternalUrl,
  getTaskPriorityPresentation,
  getTaskStatusPresentation,
} from "@/modules/events/presentation";

import { createEventTemplateFromEventAction } from "./planning-actions";
import { RecalculateDueDatesForm } from "./recalculate-due-dates-form";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type CockpitAuditLog = NonNullable<
  Awaited<ReturnType<typeof getEventCockpit>>
>["auditLogs"][number];
type CockpitTask = NonNullable<
  Awaited<ReturnType<typeof getEventCockpit>>
>["event"]["tasks"][number];
type ReadinessAreaKey = NonNullable<
  Awaited<ReturnType<typeof getEventCockpit>>
>["readiness"]["missingAreas"][number]["key"];

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
      text: "Dieser Vorlagenname wird bereits verwendet. Bitte wÃ¤hle einen anderen Namen.",
    },
    empty: {
      tone: "red",
      text: "FÃ¼r dieses Event sind noch keine Aufgaben vorhanden, aus denen eine Vorlage erstellt werden kann.",
    },
    invalid: {
      tone: "red",
      text: "Bitte gib einen Namen fÃ¼r die neue Vorlage ein.",
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
          Vorlage Ã¶ffnen
        </Link>
      ) : null}
    </div>
  );
}

function AuditHistory({ logs }: { logs: CockpitAuditLog[] }) {
  const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (logs.length === 0) {
    return (
      <EmptyState
        description="Neue wichtige Ã„nderungen an Event und Aufgaben erscheinen automatisch an dieser Stelle."
        title="Noch keine Ã„nderungen protokolliert"
      />
    );
  }

  return (
    <ol className="divide-y divide-slate-100">
      {logs.map((log) => {
        const changes = getAuditChanges(log.oldValue, log.newValue);
        const hasOldValue = log.oldValue !== null;

        return (
          <li className="px-5 py-4" key={log.id}>
            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
              <div>
                <p className="font-bold text-slate-800">
                  {getAuditActionLabel(log.action)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {log.entityType === "EventTask" ? "Aufgabe: " : "Event: "}
                  {log.entityLabel}
                  {log.user ? ` Â· ${log.user.name}` : ""}
                </p>
              </div>
              <time
                className="shrink-0 text-xs font-medium text-slate-500"
                dateTime={log.createdAt.toISOString()}
              >
                {dateTimeFormatter.format(log.createdAt)}
              </time>
            </div>

            {changes.length > 0 ? (
              <dl className="mt-3 grid gap-2 lg:grid-cols-2">
                {changes.map((change) => (
                  <div
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    key={change.field}
                  >
                    <dt className="text-xs font-bold text-slate-500">
                      {change.label}
                    </dt>
                    <dd className="mt-1 text-sm text-slate-700">
                      {hasOldValue ? (
                        <>
                          <span className="text-slate-500 line-through">
                            {change.oldValue}
                          </span>
                          <span className="mx-2 text-slate-400">â†’</span>
                        </>
                      ) : null}
                      <span className="font-semibold">{change.newValue}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "blue" | "red" | "green";
}) {
  const tones = {
    neutral: "bg-slate-50 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    green: "bg-emerald-50 text-emerald-700",
  };

  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={`mt-3 inline-flex rounded-lg px-3 py-1 text-2xl font-bold ${tones[tone]}`}
      >
        {value}
      </p>
      <p className="mt-3 text-xs font-medium text-slate-500">{hint}</p>
    </Card>
  );
}

function ReadinessCard({
  eventId,
  readiness,
}: {
  eventId: string;
  readiness: NonNullable<
    Awaited<ReturnType<typeof getEventCockpit>>
  >["readiness"];
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
              Alle Readiness-Kriterien sind erfÃ¼llt. Aktuell gehen keine Punkte
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

function EvaluationCard({
  event,
}: {
  event: NonNullable<Awaited<ReturnType<typeof getEventCockpit>>>["event"];
}) {
  const evaluation = event.evaluation;

  if (!evaluation) {
    return (
      <Card className="mt-6">
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-brand-950 font-bold">Evaluation & Wirkung</h2>
            <p className="text-muted mt-1 text-sm leading-6">
              FÃ¼r dieses Event wurden noch keine Kennzahlen oder Learnings
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
      value: evaluation.registrations?.toLocaleString("de-DE") ?? "â€“",
    },
    {
      label: "Teilnehmende",
      value: evaluation.attendees?.toLocaleString("de-DE") ?? "â€“",
    },
    {
      label: "No-Show-Quote",
      value: formatNoShowRate(evaluation.noShowRate),
    },
    {
      label: "Zielgruppenfit",
      value:
        evaluation.targetAudienceFit === null
          ? "â€“"
          : `${evaluation.targetAudienceFit} / 5`,
    },
    {
      label: "Zufriedenheit",
      value:
        evaluation.satisfaction === null
          ? "â€“"
          : `${evaluation.satisfaction.toLocaleString("de-DE")} / 5`,
    },
    {
      label: "NPS",
      value: evaluation.netPromoterScore?.toLocaleString("de-DE") ?? "â€“",
    },
  ];
  const learnings = [
    ["Qualitative Learnings", evaluation.qualitativeLearnings],
    ["Was lief gut?", evaluation.wentWell],
    ["Was war schwierig?", evaluation.wasDifficult],
    ["Beim nÃ¤chsten Mal anders", evaluation.nextTimeDifferent],
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
              nicht ergÃ¤nzt.
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
  metrics: NonNullable<
    Awaited<ReturnType<typeof getEventCockpit>>
  >["participantMetrics"];
}) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-brand-950 font-bold">Teilnehmermanagement</h2>
          <p className="text-muted mt-1 text-xs">
            Gepflegte Kontakte fÃ¼r dieses Event
          </p>
        </div>
        <Link
          className="text-brand-700 text-sm font-semibold hover:underline"
          href={`/events/${eventId}/participants`}
        >
          Teilnehmerliste Ã¶ffnen
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
    `Aus dem Event "${eventTitle}" erstellt. Aufgaben werden beim nÃ¤chsten Event offen angelegt.`.slice(
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
        Ãœbernimmt {taskCount.toLocaleString("de-DE")} {" "}
        {taskCount === 1 ? "Aufgabe" : "Aufgaben"} aus diesem Event. Status,
        Erledigungen und Synchronisationsdaten werden nicht Ã¼bernommen.
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

function ModuleActionLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      className="group hover:border-brand-300 hover:bg-brand-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition"
      href={href}
    >
      <span className="text-brand-950 group-hover:text-brand-800 block text-sm font-bold">
        {title}
      </span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">
        {description}
      </span>
    </Link>
  );
}

function TaskTable({
  tasks,
  emptyTitle,
  emptyDescription,
}: {
  tasks: CockpitTask[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (tasks.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-5 py-3">Aufgabe</th>
            <th className="px-4 py-3">Phase</th>
            <th className="px-4 py-3">Verantwortlich</th>
            <th className="px-4 py-3">PrioritÃ¤t</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-5 py-3 text-right">FÃ¤llig</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const priority = getTaskPriorityPresentation(task.priority);
            const status = getTaskStatusPresentation(task.status);

            return (
              <tr className="hover:bg-slate-50/80" key={task.id}>
                <td className="px-5 py-4 font-semibold text-slate-800">
                  {task.title}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {getPhaseLabel(task.phase)}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {task.responsibleUser?.name ?? "Nicht zugewiesen"}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge color={priority.color}>
                    {priority.label}
                  </StatusBadge>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge color={status.color}>{status.label}</StatusBadge>
                </td>
                <td className="px-5 py-4 text-right font-semibold text-slate-700">
                  {formatDate(task.dueDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
  const cockpit = await getEventCockpit(id);
  const currentUser = await getCurrentUser();

  if (!cockpit) {
    notFound();
  }

  const {
    event,
    metrics,
    participantMetrics,
    readiness,
    nextDeadlines,
    overdueTasks,
    criticalTasks,
    auditLogs,
  } = cockpit;
  const planningResult =
    firstValue(query.planning) === "recalculated"
      ? {
          updated: Number(firstValue(query.updated) ?? 0),
          skipped: Number(firstValue(query.skipped) ?? 0),
          withoutOffset: Number(firstValue(query.withoutOffset) ?? 0),
        }
      : null;
  const tasksWithOffset = event.tasks.filter(
    (task) => task.offsetDays !== null,
  ).length;
  const manualOverrideCount = event.tasks.filter(
    (task) => task.offsetDays !== null && task.isDueDateManuallyOverridden,
  ).length;
  const canManageEvents = hasPermission(currentUser, Permission.MANAGE_EVENTS);
  const links = [
    ["Eventlink", event.registrationUrl],
    ["Feedbackformular", event.feedbackFormUrl],
  ]
    .map(([label, value]) => ({
      label,
      href: getSafeExternalUrl(value),
    }))
    .filter(
      (link): link is { label: string; href: string } => link.href !== null,
    );
  const moduleActions = [
    canManageEvents
      ? {
          title: "Event bearbeiten",
          description: "Stammdaten, Rollen, Links oder Event lÃ¶schen",
          href: `/events/${event.id}/edit`,
        }
      : null,
    {
      title: "Aufgaben planen",
      description: "Aufgaben, Status, Verantwortliche und FÃ¤lligkeiten",
      href: `/events/${event.id}/tasks`,
    },
    {
      title: "Kommunikation planen",
      description: "KanÃ¤le, Botschaften, Freigaben und Kennzahlen",
      href: `/events/${event.id}/communications`,
    },
    {
      title: "Teilnehmende verwalten",
      description: "Kontaktliste und CSV-Import",
      href: `/events/${event.id}/participants`,
    },
    {
      title: "Evaluation & Wirkung",
      description: "Kennzahlen, No-Show-Quote und Learnings",
      href: `/events/${event.id}/evaluation`,
    },
  ].filter(
    (action): action is { title: string; description: string; href: string } =>
      action !== null,
  );

  return (
    <>
      <div className="mb-5">
        <Link
          className="text-brand-700 hover:text-brand-950 text-sm font-semibold"
          href="/events"
        >
          â† ZurÃ¼ck zur Eventliste
        </Link>
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-5 p-5 xl:grid-cols-[1fr_280px] xl:p-6">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-500">
                {event.format ?? "Format nicht festgelegt"}
              </span>
            </div>
            <h1 className="text-brand-950 max-w-5xl text-2xl font-bold tracking-tight sm:text-3xl">
              {event.title}
            </h1>
            <p className="text-muted mt-2 max-w-4xl text-sm leading-6 sm:text-base">
              {event.description ??
                "FÃ¼r dieses Event ist noch keine Beschreibung hinterlegt."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:max-w-3xl">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Termin
                </p>
                <p className="text-brand-950 mt-1 text-sm font-bold">
                  {formatEventDateTime(
                    event.eventDate,
                    event.startTime,
                    event.endTime,
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Ort
                </p>
                <p className="text-brand-950 mt-1 text-sm font-bold">
                  {event.location ?? "Nicht hinterlegt"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
            <div className="shadow-card min-w-48 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Gesamtfortschritt
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="bg-brand-700 h-full rounded-full"
                    style={{ width: `${metrics.progress}%` }}
                  />
                </div>
                <span className="text-brand-950 text-xl font-bold">
                  {metrics.progress}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 p-4 xl:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-brand-950 text-sm font-bold">
              Event-Funktionen
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Alles Wichtige auf einen Blick
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {moduleActions.map((action) => (
              <ModuleActionLink key={action.href} {...action} />
            ))}
          </div>
        </div>
      </Card>

      {planningResult ? (
        <div
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          <strong>{planningResult.updated} FÃ¤lligkeiten aktualisiert.</strong>
          {planningResult.skipped > 0
            ? ` ${planningResult.skipped} manuell Ã¼berschriebene Termine wurden geschÃ¼tzt.`
            : ""}
          {planningResult.withoutOffset > 0
            ? ` ${planningResult.withoutOffset} Aufgaben ohne Offset blieben unverÃ¤ndert.`
            : ""}
        </div>
      ) : null}

      <TemplateSaveMessage query={query} />

      <ReadinessCard eventId={event.id} readiness={readiness} />

      <ParticipantCard eventId={event.id} metrics={participantMetrics} />

      <EvaluationCard event={event} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint={`${metrics.completedTasks} von ${metrics.totalTasks} relevanten Aufgaben erledigt`}
          label="Fortschritt"
          tone="blue"
          value={`${metrics.progress}%`}
        />
        <MetricCard
          hint="Noch nicht abgeschlossen"
          label="Offene Aufgaben"
          value={metrics.openTasks}
        />
        <MetricCard
          hint="FÃ¤lligkeit bereits Ã¼berschritten"
          label="ÃœberfÃ¤llig"
          tone={metrics.overdueTasks > 0 ? "red" : "green"}
          value={metrics.overdueTasks}
        />
        <MetricCard
          hint="Offen und als kritisch markiert"
          label="Kritische Aufgaben"
          tone={metrics.criticalOpenTasks > 0 ? "red" : "green"}
          value={metrics.criticalOpenTasks}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Stammdaten</h2>
            <p className="text-muted mt-1 text-xs">
              Fachliche und organisatorische Eckdaten des Events
            </p>
          </div>
          <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
            <DetailField
              label="Eventdatum"
              value={formatEventDateTime(
                event.eventDate,
                event.startTime,
                event.endTime,
              )}
            />
            <DetailField label="Location" value={event.location} />
            <DetailField
              className="sm:col-span-2"
              label="Zielgruppe"
              value={event.targetAudience}
            />
            <DetailField
              className="sm:col-span-2"
              label="Ziele, Nutzenversprechen, gewÃ¼nschtes Ergebnis"
              value={event.goal}
            />
          </dl>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-brand-950 font-bold">Verantwortlichkeiten</h2>
            </div>
            <dl className="space-y-4 p-5">
              <DetailField label="Event Lead" value={event.eventLead?.name} />
              <DetailField label="Co-Lead" value={event.coLead?.name} />
              <DetailField
                label="Kommunikation"
                value={event.communicationOwner?.name}
              />
            </dl>
          </Card>

          <Card>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-brand-950 font-bold">Zentrale Links</h2>
            </div>
            {links.length === 0 ? (
              <div className="p-5">
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  FÃ¼r dieses Event sind noch keine zentralen Links hinterlegt.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 p-5 sm:grid-cols-2 xl:grid-cols-1">
                {links.map((link) => (
                  <a
                    className="text-brand-800 hover:border-brand-300 hover:bg-brand-50 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                    href={link.href}
                    key={link.label}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                    <span aria-hidden="true">â†—</span>
                  </a>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-brand-950 font-bold">RÃ¼ckwÃ¤rtsplanung</h2>
              <p className="text-muted mt-1 text-xs">
                Nach einer Ã„nderung des Eventdatums explizit auslÃ¶sen
              </p>
            </div>
            <div className="p-5">
              {tasksWithOffset > 0 && canManageEvents ? (
                <RecalculateDueDatesForm
                  eventId={event.id}
                  manualOverrideCount={manualOverrideCount}
                  tasksWithOffset={tasksWithOffset}
                />
              ) : tasksWithOffset === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  Keine Aufgaben mit hinterlegtem Offset vorhanden.
                </p>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  Die Neuberechnung kann nur durch Admins oder Event Leads
                  ausgelÃ¶st werden.
                </p>
              )}
            </div>
          </Card>

          {canManageEvents ? (
            <Card>
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-brand-950 font-bold">Vorlage aus Event</h2>
                <p className="text-muted mt-1 text-xs">
                  Aktuelle Aufgabenliste fÃ¼r gleiche kÃ¼nftige Events sichern
                </p>
              </div>
              <div className="p-5">
                <SaveTemplateFromEventForm
                  eventId={event.id}
                  eventTitle={event.title}
                  taskCount={event.tasks.length}
                />
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">NÃ¤chste 5 Deadlines</h2>
            <p className="text-muted mt-1 text-xs">
              Die nÃ¤chsten noch offenen Aufgaben ab heute
            </p>
          </div>
          <TaskTable
            emptyDescription="Es gibt derzeit keine offenen Aufgaben mit einer zukÃ¼nftigen FÃ¤lligkeit."
            emptyTitle="Keine anstehenden Deadlines"
            tasks={nextDeadlines}
          />
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-red-800">ÃœberfÃ¤llige Aufgaben</h2>
            <p className="text-muted mt-1 text-xs">
              Offene Aufgaben mit Ã¼berschrittener FÃ¤lligkeit
            </p>
          </div>
          <TaskTable
            emptyDescription="Alle fÃ¤lligen Aufgaben sind erledigt oder liegen noch in der Zukunft."
            emptyTitle="Keine Ã¼berfÃ¤lligen Aufgaben"
            tasks={overdueTasks}
          />
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-red-800">Kritische Aufgaben</h2>
            <p className="text-muted mt-1 text-xs">
              Offene Aufgaben, die fÃ¼r den Eventerfolg besonders relevant sind
            </p>
          </div>
          <TaskTable
            emptyDescription="Aktuell ist keine offene Aufgabe als kritisch markiert."
            emptyTitle="Keine kritischen Aufgaben"
            tasks={criticalTasks}
          />
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Ã„nderungsverlauf</h2>
            <p className="text-muted mt-1 text-xs">
              Die letzten wichtigen Ã„nderungen an Event und Aufgaben
            </p>
          </div>
          <AuditHistory logs={auditLogs} />
        </Card>
      </div>
    </>
  );
}
