"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import { UserRole } from "@/generated/prisma/enums";
import type {
  RunOfShowFormState,
  RunOfShowFormValues,
} from "@/modules/run-of-show/run-of-show-form";

import {
  createRunOfShowItemAction,
  updateRunOfShowItemAction,
} from "./actions";

type UserOption = {
  id: string;
  name: string;
  role: UserRole;
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
  name: keyof RunOfShowFormValues;
  state: RunOfShowFormState;
}) {
  const errors = state.fieldErrors[name];

  return errors?.length ? (
    <p className="mt-1.5 text-xs font-semibold text-red-700">{errors[0]}</p>
  ) : null;
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

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending
        ? "Programmpunkt wird gespeichert..."
        : mode === "create"
          ? "Programmpunkt anlegen"
          : "Änderungen speichern"}
    </button>
  );
}

function TextArea({
  label,
  name,
  state,
  rows = 3,
  placeholder,
}: {
  label: string;
  name: "goal" | "method" | "material" | "risk" | "transitionNote";
  state: RunOfShowFormState;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        className="focus:border-brand-500 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none"
        defaultValue={state.values[name]}
        maxLength={name === "transitionNote" ? 5000 : 3000}
        name={name}
        placeholder={placeholder}
        rows={rows}
      />
      <FieldError name={name} state={state} />
    </label>
  );
}

export function RunOfShowForm({
  initialValues,
  mode,
  users,
}: {
  initialValues: RunOfShowFormValues;
  mode: "create" | "edit";
  users: UserOption[];
}) {
  const action =
    mode === "create" ? createRunOfShowItemAction : updateRunOfShowItemAction;
  const [state, formAction] = useActionState(action, {
    values: initialValues,
    fieldErrors: {},
  });
  const inputClass =
    "focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";

  return (
    <form action={formAction} noValidate>
      <input name="eventId" type="hidden" value={state.values.eventId} />
      <input name="itemId" type="hidden" value={state.values.itemId} />

      {state.formError ? (
        <div
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Zeit und Programmpunkt</h2>
            <p className="mt-1 text-xs text-slate-500">
              Chronologische Eckdaten für den Eventtag
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <label className="block">
              <FieldLabel required>Startzeit</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.startTime}
                name="startTime"
                required
                type="time"
              />
              <FieldError name="startTime" state={state} />
            </label>

            <label className="block">
              <FieldLabel required>Endzeit</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.endTime}
                name="endTime"
                required
                type="time"
              />
              <FieldError name="endTime" state={state} />
            </label>

            <label className="block md:col-span-2">
              <FieldLabel required>Programmpunkt</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.programItem}
                maxLength={300}
                name="programItem"
                placeholder="Zum Beispiel: Begrüßung und Einführung"
                required
                type="text"
              />
              <FieldError name="programItem" state={state} />
            </label>

            <label className="block md:col-span-2">
              <FieldLabel>Verantwortlich</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.responsibleUserId}
                name="responsibleUserId"
              >
                <option value="">Nicht zugewiesen</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {roleLabels[user.role]}
                  </option>
                ))}
              </select>
              <FieldError name="responsibleUserId" state={state} />
            </label>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Regieinformationen</h2>
            <p className="mt-1 text-xs text-slate-500">
              Inhaltliche, organisatorische und moderative Hinweise
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <TextArea label="Ziel" name="goal" state={state} />
            <TextArea label="Methode" name="method" state={state} />
            <TextArea label="Material" name="material" state={state} />
            <TextArea
              label="Risiko"
              name="risk"
              placeholder="Mögliche Störung und Gegenmaßnahme"
              state={state}
            />
            <div className="md:col-span-2">
              <TextArea
                label="Übergang/Moderationshinweis"
                name="transitionNote"
                rows={4}
                state={state}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          href={`/events/${state.values.eventId}/run-of-show`}
        >
          Abbrechen
        </Link>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
