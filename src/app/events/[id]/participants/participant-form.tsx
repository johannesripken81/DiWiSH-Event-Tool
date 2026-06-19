"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import type {
  ParticipantFormState,
  ParticipantFormValues,
} from "@/modules/participants/participant-form";

import { createParticipantAction, updateParticipantAction } from "./actions";

function FieldError({
  name,
  state,
}: {
  name: keyof ParticipantFormValues;
  state: ParticipantFormState;
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
        ? "Person wird gespeichert..."
        : mode === "create"
          ? "Person anlegen"
          : "Änderungen speichern"}
    </button>
  );
}

function TextInput({
  label,
  name,
  state,
  required = false,
  type = "text",
}: {
  label: string;
  name: keyof ParticipantFormValues;
  state: ParticipantFormState;
  required?: boolean;
  type?: "text" | "email";
}) {
  const inputClass =
    "focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";

  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        className={inputClass}
        defaultValue={state.values[name]}
        maxLength={name === "email" ? 320 : 300}
        name={name}
        required={required}
        type={type}
      />
      <FieldError name={name} state={state} />
    </label>
  );
}

export function ParticipantForm({
  initialValues,
  mode,
}: {
  initialValues: ParticipantFormValues;
  mode: "create" | "edit";
}) {
  const action =
    mode === "create" ? createParticipantAction : updateParticipantAction;
  const [state, formAction] = useActionState(action, {
    values: initialValues,
    fieldErrors: {},
  });

  return (
    <form action={formAction} noValidate>
      <input name="eventId" type="hidden" value={state.values.eventId} />
      <input
        name="participantId"
        type="hidden"
        value={state.values.participantId}
      />

      {state.formError ? (
        <div
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-brand-950 font-bold">Person und Organisation</h2>
          <p className="text-muted mt-1 text-xs">
            Für die Eventplanung reichen diese Kontaktdaten aus.
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <TextInput label="Vorname" name="firstName" required state={state} />
          <TextInput label="Nachname" name="lastName" required state={state} />
          <TextInput
            label="E-Mail"
            name="email"
            required
            state={state}
            type="email"
          />
          <TextInput label="Organisation" name="organization" state={state} />
        </div>
      </Card>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          href={`/events/${state.values.eventId}/participants`}
        >
          Abbrechen
        </Link>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
