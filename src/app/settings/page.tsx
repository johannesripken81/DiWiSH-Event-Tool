import type { Metadata } from "next";
import Link from "next/link";

import { Card, EmptyHint, PageHeader, StatusBadge } from "@/components/ui";
import { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/current-user";
import {
  getNotificationSettings,
  getWorkspaceSettings,
} from "@/modules/settings/queries";
import {
  getCachedEventTemplateOptions,
  getCachedSettingsUsers,
} from "@/modules/settings/reference-data";

import {
  createEventTemplateAction,
  createUserAction,
  deleteUserAction,
  ensureDefaultEventTemplatesAction,
  generateNotificationsAction,
  saveNotificationSettingsAction,
  saveWorkspaceSettingsAction,
  updateUserAction,
} from "./actions";
import {
  CheckboxSetting,
  EditableDetails,
  FieldLabel,
  RoleSelect,
  SummaryItem,
  inputClass,
  notificationLabels,
  primaryButtonClass,
  roleLabels,
  secondaryButtonClass,
} from "./settings-ui";

export const metadata: Metadata = {
  title: "Einstellungen",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMessage(query: SearchParams) {
  const saved = firstValue(query.saved);
  const error = firstValue(query.error);
  const section = firstValue(query.section);

  if (saved === "workspace") {
    return { tone: "green", text: "Arbeitsbereich gespeichert." } as const;
  }

  if (saved === "team") {
    return { tone: "green", text: "Team und Rollen gespeichert." } as const;
  }

  if (saved === "templates") {
    return { tone: "green", text: "Eventvorlagen gespeichert." } as const;
  }

  if (saved === "default-templates") {
    return {
      tone: "green",
      text: `${firstValue(query.templates) ?? "0"} Standardvorlagen mit ${
        firstValue(query.tasks) ?? "0"
      } Aufgaben aktualisiert.`,
    } as const;
  }

  if (saved === "notifications") {
    return {
      tone: "green",
      text: "Benachrichtigungsregeln gespeichert.",
    } as const;
  }

  if (saved === "notifications-run") {
    return {
      tone: "green",
      text: `${firstValue(query.created) ?? "0"} Benachrichtigungen erzeugt; ${
        firstValue(query.checked) ?? "0"
      } Aufgaben geprüft.`,
    } as const;
  }

  if (error === "admin") {
    return {
      tone: "red",
      text: "Nur Admins können Einstellungen ändern.",
    } as const;
  }

  if (error === "invalid") {
    return {
      tone: "red",
      text: `Eingaben konnten nicht gespeichert werden${
        section ? ` (${section})` : ""
      }. Bitte Werte prüfen.`,
    } as const;
  }

  if (error === "last-admin") {
    return {
      tone: "red",
      text: "Der letzte Admin darf nicht entfernt oder herabgestuft werden.",
    } as const;
  }

  if (error === "current-user") {
    return {
      tone: "red",
      text: "Der aktuell aktive Nutzer kann nicht gelöscht werden.",
    } as const;
  }

  if (error === "user-email") {
    return {
      tone: "red",
      text: "Diese E-Mail-Adresse wird bereits verwendet oder ist ungültig.",
    } as const;
  }

  if (error === "password") {
    return {
      tone: "red",
      text: "Bitte ein Passwort mit mindestens 10 Zeichen angeben.",
    } as const;
  }

  if (error === "template-name") {
    return {
      tone: "red",
      text: "Dieser Vorlagenname wird bereits verwendet.",
    } as const;
  }

  if (error === "notifications-run") {
    return {
      tone: "red",
      text: "Benachrichtigungen konnten gerade nicht erzeugt werden. Bitte später erneut versuchen.",
    } as const;
  }

  return null;
}

function CardHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-4">
      <h2 className="text-brand-950 font-bold">{title}</h2>
      <p className="text-muted mt-1 text-xs leading-5">{description}</p>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const currentUser = await getCurrentUser();
  const [workspaceSettings, notificationSettings, users, templates] =
    await Promise.all([
      getWorkspaceSettings(),
      getNotificationSettings(),
      getCachedSettingsUsers(),
      getCachedEventTemplateOptions(),
    ]);
  const message = getMessage(query);
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const emailDeliveryConfigured = Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  );
  const activeNotificationCount = notificationLabels.filter(
    (item) => notificationSettings[item.name],
  ).length;

  return (
    <>
      <PageHeader
        description="Arbeitsbereich, Teamzugriff, wiederverwendbare Eventvorlagen und interne Benachrichtigungen konfigurieren."
        eyebrow="Administration"
        title="Einstellungen"
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
            Du kannst die Einstellungen ansehen. Änderungen sind aktuell Admins
            vorbehalten.
          </EmptyHint>
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <CardHeader
            description="Grunddaten für Exporte, E-Mails und spätere Integrationen."
            title="Arbeitsbereich"
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SummaryItem
                label="Name"
                value={workspaceSettings.workspaceName}
              />
              <SummaryItem
                label="Organisation"
                value={workspaceSettings.organizationName}
              />
              <SummaryItem
                label="Kontakt"
                value={workspaceSettings.contactEmail}
              />
              <SummaryItem
                label="Website"
                value={workspaceSettings.websiteUrl}
              />
              <SummaryItem
                label="Standard-Location"
                value={workspaceSettings.defaultLocation}
              />
            </div>

            {isAdmin ? (
              <EditableDetails
                description="Formular erst öffnen, wenn du die Arbeitsbereichsdaten ändern möchtest."
                title="Arbeitsbereich bearbeiten"
              >
                <form action={saveWorkspaceSettingsAction}>
                  <input name="returnTo" type="hidden" value="/settings" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <FieldLabel>Name des Arbeitsbereichs</FieldLabel>
                      <input
                        className={inputClass}
                        defaultValue={workspaceSettings.workspaceName}
                        name="workspaceName"
                        required
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>Organisation</FieldLabel>
                      <input
                        className={inputClass}
                        defaultValue={workspaceSettings.organizationName}
                        name="organizationName"
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>Kontakt-E-Mail</FieldLabel>
                      <input
                        className={inputClass}
                        defaultValue={workspaceSettings.contactEmail}
                        name="contactEmail"
                        type="email"
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>Website</FieldLabel>
                      <input
                        className={inputClass}
                        defaultValue={workspaceSettings.websiteUrl}
                        name="websiteUrl"
                        placeholder="https://..."
                        type="url"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <FieldLabel>Standard-Location</FieldLabel>
                      <input
                        className={inputClass}
                        defaultValue={workspaceSettings.defaultLocation}
                        name="defaultLocation"
                        placeholder="Zum Beispiel: Kiel"
                      />
                    </label>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button className={primaryButtonClass} type="submit">
                      Arbeitsbereich speichern
                    </button>
                  </div>
                </form>
              </EditableDetails>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader
            description="Aktuelle Nutzer und Rollen im System."
            title="Team und Rollen"
          />
          <div className="space-y-4 p-5">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">E-Mail</th>
                    <th className="px-4 py-3">Rolle</th>
                    <th className="px-4 py-3">Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          color={user.role === UserRole.ADMIN ? "blue" : "gray"}
                        >
                          {roleLabels[user.role]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          color={user.passwordHash ? "green" : "red"}
                        >
                          {user.passwordHash
                            ? "Passwort gesetzt"
                            : "Passwort fehlt"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isAdmin ? (
              <EditableDetails
                description="Nutzer anlegen, Rollen ändern oder Zugänge entfernen."
                title="Team und Rollen bearbeiten"
              >
                <div className="space-y-4">
                  <form
                    action={createUserAction}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_1.2fr_1fr_220px_auto]"
                  >
                    <input name="returnTo" type="hidden" value="/settings" />
                    <input
                      className={inputClass}
                      name="name"
                      placeholder="Name"
                      required
                    />
                    <input
                      className={inputClass}
                      name="email"
                      placeholder="E-Mail"
                      required
                      type="email"
                    />
                    <input
                      autoComplete="new-password"
                      className={inputClass}
                      minLength={10}
                      name="password"
                      placeholder="Startpasswort"
                      required
                      type="password"
                    />
                    <RoleSelect defaultValue={UserRole.TEAM_MEMBER} />
                    <button className={primaryButtonClass} type="submit">
                      Nutzer anlegen
                    </button>
                  </form>

                  <div className="space-y-3">
                    {users.map((user) => (
                      <div
                        className="grid gap-3 rounded-xl border border-slate-200 p-4 xl:grid-cols-[1fr_1.2fr_1fr_220px_auto_auto]"
                        key={user.id}
                      >
                        <form
                          action={updateUserAction}
                          className="contents"
                          id={`user-${user.id}`}
                        >
                          <input
                            name="returnTo"
                            type="hidden"
                            value="/settings"
                          />
                          <input name="userId" type="hidden" value={user.id} />
                          <input
                            className={inputClass}
                            defaultValue={user.name}
                            name="name"
                          />
                          <input
                            className={inputClass}
                            defaultValue={user.email}
                            name="email"
                            type="email"
                          />
                          <input
                            autoComplete="new-password"
                            className={inputClass}
                            minLength={10}
                            name="password"
                            placeholder="Neues Passwort optional"
                            type="password"
                          />
                          <RoleSelect defaultValue={user.role} />
                        </form>
                        <button
                          className={secondaryButtonClass}
                          form={`user-${user.id}`}
                          type="submit"
                        >
                          Speichern
                        </button>
                        <form action={deleteUserAction}>
                          <input
                            name="returnTo"
                            type="hidden"
                            value="/settings"
                          />
                          <input name="userId" type="hidden" value={user.id} />
                          <button
                            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
                            type="submit"
                          >
                            Löschen
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              </EditableDetails>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader
            description="Übersicht der Eventvorlagen. Die Bearbeitung erfolgt bewusst auf separaten Detailseiten."
            title="Eventvorlagen"
          />
          <div className="space-y-4 p-5">
            {isAdmin ? (
              <form
                action={ensureDefaultEventTemplatesAction}
                className="flex flex-col justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center"
              >
                <input name="returnTo" type="hidden" value="/settings" />
                <div>
                  <p className="text-sm font-bold text-blue-950">
                    DIWISH-Standardvorlagen bereitstellen
                  </p>
                  <p className="mt-1 text-xs leading-5 text-blue-900">
                    Legt die Vorlagen Große Veranstaltung,
                    Fachgruppenveranstaltung (Präsenz) und
                    Fachgruppenveranstaltung (virtuell) an oder aktualisiert
                    sie.
                  </p>
                </div>
                <button className={secondaryButtonClass} type="submit">
                  Standardvorlagen aktualisieren
                </button>
              </form>
            ) : null}

            {templates.length === 0 ? (
              <EmptyHint>Es sind noch keine Eventvorlagen angelegt.</EmptyHint>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <div
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center"
                    key={template.id}
                  >
                    <div>
                      <h3 className="text-brand-950 font-bold">
                        {template.name}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {template.description ||
                          "Keine Beschreibung hinterlegt."}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {template._count.taskTemplates} Standardaufgaben
                      </p>
                    </div>
                    <Link
                      className={secondaryButtonClass}
                      href={`/settings/event-templates/${template.id}`}
                    >
                      Vorlage öffnen
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {isAdmin ? (
              <EditableDetails
                description="Neue Vorlagen nur bei Bedarf anlegen. Bestehende Vorlagen öffnest du über die Liste."
                title="Neue Eventvorlage anlegen"
              >
                <form
                  action={createEventTemplateAction}
                  className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto]"
                >
                  <input name="returnTo" type="hidden" value="/settings" />
                  <input
                    className={inputClass}
                    name="name"
                    placeholder="Neue Vorlage, z. B. Workshop"
                    required
                  />
                  <input
                    className={inputClass}
                    name="description"
                    placeholder="Beschreibung"
                  />
                  <button className={primaryButtonClass} type="submit">
                    Vorlage anlegen
                  </button>
                </form>
              </EditableDetails>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader
            description="Interne Hinweise und tägliche E-Mail-Erinnerungen für fällige Aufgaben steuern."
            title="Benachrichtigungen"
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SummaryItem
                label="Aktive Regeln"
                value={`${activeNotificationCount} von ${notificationLabels.length}`}
              />
              <SummaryItem
                label="E-Mail-Versand"
                value={
                  emailDeliveryConfigured ? (
                    <StatusBadge color="green">Konfiguriert</StatusBadge>
                  ) : (
                    <StatusBadge color="red">Nicht konfiguriert</StatusBadge>
                  )
                }
              />
              {notificationLabels.map((item) => (
                <SummaryItem
                  key={item.name}
                  label={item.title}
                  value={
                    notificationSettings[item.name] ? (
                      <StatusBadge color="green">Aktiv</StatusBadge>
                    ) : (
                      <StatusBadge color="gray">Inaktiv</StatusBadge>
                    )
                  }
                />
              ))}
            </div>

            {isAdmin ? (
              <div className="space-y-4">
                <EditableDetails
                  description="Regeln erst öffnen, wenn du die automatische Erzeugung interner Hinweise ändern möchtest."
                  title="Benachrichtigungsregeln bearbeiten"
                >
                  <form action={saveNotificationSettingsAction}>
                    <input name="returnTo" type="hidden" value="/settings" />
                    <fieldset className="grid gap-3 md:grid-cols-2">
                      {notificationLabels.map((item) => (
                        <CheckboxSetting
                          defaultChecked={notificationSettings[item.name]}
                          description={item.description}
                          key={item.name}
                          name={item.name}
                          title={item.title}
                        />
                      ))}
                    </fieldset>
                    <div className="mt-5 flex justify-end">
                      <button className={primaryButtonClass} type="submit">
                        Regeln speichern
                      </button>
                    </div>
                  </form>
                </EditableDetails>

                <form
                  action={generateNotificationsAction}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Benachrichtigungen jetzt erzeugen
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Prüft offene Aufgaben und legt interne
                      Notification-Einträge nach den aktiven Regeln an.
                    </p>
                  </div>
                  <button className={secondaryButtonClass} type="submit">
                    Jetzt prüfen
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <EmptyHint>
          Hinweis: Änderungen an Eventvorlagen wirken auf neu angelegte Events.
          Bereits erzeugte Event-Aufgaben bleiben bewusst unverändert. Microsoft
          Planner ist weiterhin nur vorbereitet; E-Mail-Erinnerungen laufen über
          die konfigurierte Cron- und Resend-Anbindung.
        </EmptyHint>
      </div>

      <div className="mt-5">
        <Link
          className="text-brand-700 hover:text-brand-950 text-sm font-semibold"
          href="/"
        >
          Zurück zum Dashboard
        </Link>
      </div>
    </>
  );
}
