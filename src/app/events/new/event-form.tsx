"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import { UserRole } from "@/generated/prisma/enums";
import {
  initialEventFormState,
  type EventFormState,
  type EventFormValues,
} from "@/modules/events/create-event";

import { createEventAction, updateEventAction } from "./actions";

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  taskCount: number;
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  EVENT_LEAD: "Event Lead",
  COMMUNICATION: "Kommunikation",
  TEAM_MEMBER: "Team",
  GUEST: "Gast",
};

function FieldError({
  name,
  state,
}: {
  name: keyof EventFormValues;
  state: EventFormState;
}) {
  const errors = state.fieldErrors[name];

  if (!errors?.length) {
    return null;
  }

  return (
    <p className="mt-1.5 text-xs font-semibold text-red-700">{errors[0]}</p>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
      {children}
      {required ? <span className="ml-1 text-red-600">*</span> : null}
    </span>
  );
}

function TextInput({
  label,
  name,
  state,
  required = false,
  type = "text",
  placeholder,
  inputMode,
  min,
}: {
  label: string;
  name: keyof EventFormValues;
  state: EventFormState;
  required?: boolean;
  type?: "text" | "date" | "time" | "url" | "number";
  placeholder?: string;
  inputMode?: "decimal" | "numeric" | "url";
  min?: string;
}) {
  const hasError = Boolean(state.fieldErrors[name]?.length);

  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        aria-describedby={hasError ? `${name}-error` : undefined}
        aria-invalid={hasError}
        className={`min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 ${
          hasError
            ? "border-red-400 focus:border-red-600"
            : "focus:border-brand-500 border-slate-300"
        }`}
        defaultValue={state.values[name]}
        inputMode={inputMode}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      <span id={`${name}-error`}>
        <FieldError name={name} state={state} />
      </span>
    </label>
  );
}

function TextArea({
  label,
  name,
  state,
  rows = 4,
  placeholder,
}: {
  label: string;
  name: keyof EventFormValues;
  state: EventFormState;
  rows?: number;
  placeholder?: string;
}) {
  const hasError = Boolean(state.fieldErrors[name]?.length);

  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        aria-invalid={hasError}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 ${
          hasError
            ? "border-red-400 focus:border-red-600"
            : "focus:border-brand-500 border-slate-300"
        }`}
        defaultValue={state.values[name]}
        name={name}
        placeholder={placeholder}
        rows={rows}
      />
      <FieldError name={name} state={state} />
    </label>
  );
}

function UserSelect({
  label,
  name,
  state,
  users,
  required = false,
}: {
  label: string;
  name: "eventLeadId" | "coLeadId" | "communicationOwnerId";
  state: EventFormState;
  users: UserOption[];
  required?: boolean;
}) {
  const hasError = Boolean(state.fieldErrors[name]?.length);

  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        aria-invalid={hasError}
        className={`min-h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 outline-none ${
          hasError
            ? "border-red-400 focus:border-red-600"
            : "focus:border-brand-500 border-slate-300"
        }`}
        defaultValue={state.values[name]}
        name={name}
        required={required}
      >
        <option value="">Nicht zugewiesen</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} · {roleLabels[user.role]}
          </option>
        ))}
      </select>
      <FieldError name={name} state={state} />
    </label>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending
        ? "Event wird gespeichert..."
        : mode === "create"
          ? "Event anlegen"
          : "Änderungen speichern"}
    </button>
  );
}

export function EventForm({
  initialState = initialEventFormState,
  mode = "create",
  users,
  templates,
}: {
  initialState?: EventFormState;
  mode?: "create" | "edit";
  users: UserOption[];
  templates: TemplateOption[];
}) {
  const action = mode === "create" ? createEventAction : updateEventAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input name="eventId" type="hidden" value={state.values.eventId} />
      {state.formError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-brand-950 font-bold">Grunddaten</h2>
          <p className="text-muted mt-1 text-xs">
            Titel, Termin und organisatorischer Rahmen des Events
          </p>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextInput
              label="Titel"
              name="title"
              placeholder="Zum Beispiel: DIWISH Netzwerktreffen Zukunftstechnologien"
              required
              state={state}
            />
          </div>
          <div className="sm:col-span-2">
            <TextArea
              label="Beschreibung"
              name="description"
              placeholder="Kurze Einordnung des Events"
              state={state}
            />
          </div>
          <TextInput
            label="Eventdatum"
            name="eventDate"
            required
            state={state}
            type="date"
          />
          <TextInput
            label="Location"
            name="location"
            placeholder="Ort oder Veranstaltungsstätte"
            state={state}
          />
          <TextInput
            label="Startzeit"
            name="startTime"
            state={state}
            type="time"
          />
          <TextInput label="Endzeit" name="endTime" state={state} type="time" />
          <TextInput
            label="Format"
            name="format"
            placeholder="Zum Beispiel: Netzwerktreffen"
            required
            state={state}
          />
          <TextInput
            inputMode="decimal"
            label="Budgetrahmen in EUR"
            name="budgetFrame"
            placeholder="Zum Beispiel: 5000,00"
            state={state}
          />
          <TextInput
            inputMode="numeric"
            label="Teilnehmerziel"
            min="1"
            name="participantGoal"
            placeholder="Zum Beispiel: 60"
            state={state}
            type="number"
          />
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-brand-950 font-bold">Ziele und Zielgruppe</h2>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <TextArea
            label="Ziele, Nutzenversprechen, gewünschtes Ergebnis"
            name="goal"
            placeholder="Was soll erreicht werden, welchen Nutzen bietet das Event und welches Ergebnis wird erwartet?"
            state={state}
          />
          <TextArea
            label="Zielgruppe"
            name="targetAudience"
            placeholder="Für wen ist die Veranstaltung gedacht?"
            state={state}
          />
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-brand-950 font-bold">Verantwortlichkeiten</h2>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-3">
          <UserSelect
            label="Event Lead"
            name="eventLeadId"
            required
            state={state}
            users={users}
          />
          <UserSelect
            label="Co-Lead"
            name="coLeadId"
            state={state}
            users={users}
          />
          <UserSelect
            label="Kommunikationsverantwortliche Person"
            name="communicationOwnerId"
            state={state}
            users={users}
          />
        </div>
      </Card>

      {mode === "create" ? (
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">
              Template und Aufgabenplan
            </h2>
            <p className="text-muted mt-1 text-xs">
              Bei Auswahl eines Templates werden dessen Aufgaben mit berechneten
              Fälligkeiten angelegt.
            </p>
          </div>
          <div className="p-5">
            <label className="block">
              <FieldLabel>Event-Template</FieldLabel>
              <select
                className="focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none"
                defaultValue={state.values.eventTemplateId}
                name="eventTemplateId"
              >
                <option value="">Ohne Template starten</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.taskCount} Aufgaben
                  </option>
                ))}
              </select>
              <FieldError name="eventTemplateId" state={state} />
            </label>
            {templates.length === 0 ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Es sind noch keine Event-Templates vorhanden. Das Event kann
                trotzdem ohne Aufgabenplan angelegt werden.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-brand-950 font-bold">Zentrale Links</h2>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <TextInput
            inputMode="url"
            label="Eventlink"
            name="registrationUrl"
            placeholder="https://..."
            state={state}
            type="url"
          />
          <TextInput
            inputMode="url"
            label="Feedbackformular-Link"
            name="feedbackFormUrl"
            placeholder="https://..."
            state={state}
            type="url"
          />
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          href={
            mode === "edit" && state.values.eventId
              ? `/events/${state.values.eventId}`
              : "/events"
          }
        >
          Abbrechen
        </Link>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
