import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, EmptyHint, PageHeader, StatusBadge } from "@/components/ui";
import { EventPhase, TaskPriority, UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import {
  getPhaseLabel,
  getTaskPriorityPresentation,
} from "@/modules/events/presentation";

import {
  createTaskTemplateAction,
  deleteEventTemplateAction,
  deleteTaskTemplateAction,
  updateEventTemplateAction,
  updateTaskTemplateAction,
} from "../../actions";
import {
  EditableDetails,
  FieldLabel,
  PhaseSelect,
  PrioritySelect,
  ReviewerRoleSelect,
  RoleSelect,
  dangerButtonClass,
  inputClass,
  primaryButtonClass,
  roleLabels,
  secondaryButtonClass,
  textareaClass,
} from "../../settings-ui";

export const metadata: Metadata = {
  title: "Eventvorlage bearbeiten",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMessage(query: SearchParams) {
  const saved = firstValue(query.saved);
  const error = firstValue(query.error);

  if (saved === "templates") {
    return { tone: "green", text: "Eventvorlage gespeichert." } as const;
  }

  if (error === "invalid") {
    return {
      tone: "red",
      text: "Eingaben konnten nicht gespeichert werden. Bitte Werte prüfen.",
    } as const;
  }

  if (error === "template-name") {
    return {
      tone: "red",
      text: "Dieser Vorlagenname wird bereits verwendet.",
    } as const;
  }

  if (error === "admin") {
    return {
      tone: "red",
      text: "Nur Admins können Eventvorlagen ändern.",
    } as const;
  }

  return null;
}

export default async function EventTemplateSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ templateId }, query, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const template = await getDb().eventTemplate.findUnique({
    where: { id: templateId },
    include: {
      taskTemplates: {
        orderBy: [{ offsetDays: "asc" }, { title: "asc" }],
      },
    },
  });

  if (!template) {
    notFound();
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const message = getMessage(query);
  const returnTo = `/settings/event-templates/${template.id}`;

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href="/settings"
      >
        ← Zurück zu den Einstellungen
      </Link>

      <PageHeader
        description="Name, Beschreibung und Standardaufgaben dieser Vorlage pflegen. Änderungen gelten für neu angelegte Events."
        eyebrow="Eventvorlagen"
        title={template.name}
      />

      {message ? (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.tone === "green"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {message.text}
        </div>
      ) : null}

      {!isAdmin ? (
        <div className="mb-5">
          <EmptyHint>
            Du kannst diese Vorlage ansehen. Änderungen sind aktuell Admins
            vorbehalten.
          </EmptyHint>
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Vorlagendaten</h2>
            <p className="text-muted mt-1 text-xs leading-5">
              Diese Daten erscheinen in der Vorlagenübersicht.
            </p>
          </div>
          <div className="p-5">
            {isAdmin ? (
              <form
                action={updateEventTemplateAction}
                className="grid gap-4 md:grid-cols-2"
              >
                <input name="returnTo" type="hidden" value={returnTo} />
                <input name="templateId" type="hidden" value={template.id} />
                <label className="block">
                  <FieldLabel>Name</FieldLabel>
                  <input
                    className={inputClass}
                    defaultValue={template.name}
                    name="name"
                    required
                  />
                </label>
                <label className="block">
                  <FieldLabel>Beschreibung</FieldLabel>
                  <input
                    className={inputClass}
                    defaultValue={template.description ?? ""}
                    name="description"
                    placeholder="Beschreibung"
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-3 md:col-span-2">
                  <button className={primaryButtonClass} type="submit">
                    Vorlage speichern
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-500">Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {template.name}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-500">
                    Beschreibung
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {template.description ?? "Nicht gesetzt"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Standardaufgaben</h2>
            <p className="text-muted mt-1 text-xs leading-5">
              Übersicht der Aufgaben, die beim Anlegen eines Events aus dieser
              Vorlage erzeugt werden.
            </p>
          </div>
          <div className="space-y-4 p-5">
            {template.taskTemplates.length === 0 ? (
              <EmptyHint>
                Für diese Vorlage sind noch keine Standardaufgaben angelegt.
              </EmptyHint>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Aufgabe</th>
                      <th className="px-4 py-3">Phase</th>
                      <th className="px-4 py-3">Offset</th>
                      <th className="px-4 py-3">Verantwortung</th>
                      <th className="px-4 py-3">Priorität</th>
                      <th className="px-4 py-3">Kritisch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {template.taskTemplates.map((taskTemplate) => {
                      const priority = getTaskPriorityPresentation(
                        taskTemplate.priority,
                      );

                      return (
                        <tr key={taskTemplate.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">
                              {taskTemplate.title}
                            </p>
                            {taskTemplate.description ? (
                              <p className="mt-1 max-w-xl truncate text-xs text-slate-500">
                                {taskTemplate.description}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {getPhaseLabel(taskTemplate.phase)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {taskTemplate.offsetDays} Tage
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {roleLabels[taskTemplate.defaultResponsibleRole]}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge color={priority.color}>
                              {priority.label}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3">
                            {taskTemplate.isCritical ? (
                              <StatusBadge color="red">Ja</StatusBadge>
                            ) : (
                              <StatusBadge color="gray">Nein</StatusBadge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {isAdmin ? (
              <div className="space-y-3">
                {template.taskTemplates.map((taskTemplate) => (
                  <EditableDetails
                    description={`${getPhaseLabel(taskTemplate.phase)} · ${
                      taskTemplate.offsetDays
                    } Tage relativ zum Eventdatum`}
                    key={taskTemplate.id}
                    title={`Aufgabe bearbeiten: ${taskTemplate.title}`}
                  >
                    <form
                      action={updateTaskTemplateAction}
                      className="grid gap-3 xl:grid-cols-[1.4fr_160px_120px_160px_160px_100px_auto_auto]"
                      id={`task-template-${taskTemplate.id}`}
                    >
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <input
                        name="taskTemplateId"
                        type="hidden"
                        value={taskTemplate.id}
                      />
                      <input
                        name="eventTemplateId"
                        type="hidden"
                        value={template.id}
                      />
                      <input
                        className={inputClass}
                        defaultValue={taskTemplate.title}
                        name="title"
                        placeholder="Aufgabe"
                      />
                      <PhaseSelect defaultValue={taskTemplate.phase} />
                      <input
                        className={inputClass}
                        defaultValue={taskTemplate.offsetDays}
                        name="offsetDays"
                        title="Tage relativ zum Eventdatum"
                      />
                      <RoleSelect
                        defaultValue={taskTemplate.defaultResponsibleRole}
                        name="defaultResponsibleRole"
                      />
                      <ReviewerRoleSelect
                        defaultValue={taskTemplate.defaultReviewerRole}
                      />
                      <PrioritySelect defaultValue={taskTemplate.priority} />
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          defaultChecked={taskTemplate.isCritical}
                          name="isCritical"
                          type="checkbox"
                        />
                        Kritisch
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <input
                          defaultChecked={taskTemplate.approvalRequired}
                          name="approvalRequired"
                          type="checkbox"
                        />
                        Prüfung
                      </label>
                      <textarea
                        className={`${textareaClass} xl:col-span-6`}
                        defaultValue={taskTemplate.description ?? ""}
                        name="description"
                        placeholder="Beschreibung"
                        rows={2}
                      />
                    </form>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        className={secondaryButtonClass}
                        form={`task-template-${taskTemplate.id}`}
                        type="submit"
                      >
                        Aufgabe speichern
                      </button>
                      <form action={deleteTaskTemplateAction}>
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <input
                          name="taskTemplateId"
                          type="hidden"
                          value={taskTemplate.id}
                        />
                        <button className={dangerButtonClass} type="submit">
                          Aufgabe löschen
                        </button>
                      </form>
                    </div>
                  </EditableDetails>
                ))}

                <EditableDetails
                  description="Neue Standardaufgabe für künftig angelegte Events ergänzen."
                  title="Neue Standardaufgabe anlegen"
                >
                  <form
                    action={createTaskTemplateAction}
                    className="grid gap-3 xl:grid-cols-[1.4fr_160px_120px_160px_160px_100px_auto_auto]"
                  >
                    <input name="returnTo" type="hidden" value={returnTo} />
                    <input
                      name="eventTemplateId"
                      type="hidden"
                      value={template.id}
                    />
                    <input
                      className={inputClass}
                      name="title"
                      placeholder="Neue Aufgabe"
                      required
                    />
                    <PhaseSelect defaultValue={EventPhase.CONCEPTION} />
                    <input
                      className={inputClass}
                      defaultValue="-30"
                      name="offsetDays"
                      title="Tage relativ zum Eventdatum"
                    />
                    <RoleSelect
                      defaultValue={UserRole.EVENT_LEAD}
                      name="defaultResponsibleRole"
                    />
                    <ReviewerRoleSelect defaultValue={null} />
                    <PrioritySelect defaultValue={TaskPriority.MEDIUM} />
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input name="isCritical" type="checkbox" />
                      Kritisch
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <input name="approvalRequired" type="checkbox" />
                      Prüfung
                    </label>
                    <textarea
                      className={`${textareaClass} xl:col-span-6`}
                      name="description"
                      placeholder="Beschreibung"
                      rows={2}
                    />
                    <button
                      className={`${primaryButtonClass} xl:col-span-2`}
                      type="submit"
                    >
                      Aufgabe hinzufügen
                    </button>
                  </form>
                </EditableDetails>
              </div>
            ) : null}
          </div>
        </Card>

        {isAdmin ? (
          <Card>
            <div className="p-5">
              <EditableDetails
                description="Nur nutzen, wenn diese Vorlage nicht mehr für neue Events gebraucht wird."
                title="Vorlage löschen"
              >
                <form
                  action={deleteEventTemplateAction}
                  className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"
                >
                  <input name="returnTo" type="hidden" value="/settings" />
                  <input name="templateId" type="hidden" value={template.id} />
                  <p className="text-sm leading-6 text-slate-600">
                    Das Löschen entfernt auch alle Standardaufgaben dieser
                    Vorlage. Bereits angelegte Events bleiben unverändert.
                  </p>
                  <button className={dangerButtonClass} type="submit">
                    Vorlage löschen
                  </button>
                </form>
              </EditableDetails>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
