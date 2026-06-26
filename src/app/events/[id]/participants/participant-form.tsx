"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import {
  followUpStatusLabels,
  followUpStatusOptions,
  participantRatingLabels,
  participantRatingOptions,
  participantStatusLabels,
  participantStatusOptions,
  participantTargetGroupLabels,
  participantTargetGroupOptions,
} from "@/modules/participants/presentation";
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
  maxLength = 300,
  name,
  required = false,
  state,
  type = "text",
}: {
  label: string;
  maxLength?: number;
  name: keyof ParticipantFormValues;
  required?: boolean;
  state: ParticipantFormState;
  type?: "text" | "email";
}) {
  const inputClass =
    "focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";

  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        className={inputClass}
        defaultValue={String(state.values[name] ?? "")}
        maxLength={maxLength}
        name={name}
        required={required}
        type={type}
      />
      <FieldError name={name} state={state} />
    </label>
  );
}

function SelectInput({
  label,
  name,
  options,
  state,
}: {
  label: string;
  name: keyof ParticipantFormValues;
  options: Array<{ label: string; value: string }>;
  state: ParticipantFormState;
}) {
  const inputClass =
    "focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";

  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        className={inputClass}
        defaultValue={String(state.values[name] ?? "")}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError name={name} state={state} />
    </label>
  );
}

function CheckboxInput({
  label,
  name,
  state,
}: {
  label: string;
  name: keyof ParticipantFormValues;
  state: ParticipantFormState;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
      <input
        className="text-brand-800 size-4 rounded border-slate-300"
        defaultChecked={Boolean(state.values[name])}
        name={name}
        type="checkbox"
      />
      {label}
    </label>
  );
}

const targetGroupOptions = participantTargetGroupOptions.map((value) => ({
  value,
  label: participantTargetGroupLabels[value],
}));

const statusOptions = participantStatusOptions.map((value) => ({
  value,
  label: participantStatusLabels[value],
}));

const ratingOptions = participantRatingOptions.map((value) => ({
  value,
  label: participantRatingLabels[value],
}));

const followUpOptions = followUpStatusOptions.map((value) => ({
  value,
  label: followUpStatusLabels[value],
}));

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

      <div className="space-y-6">
        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">
              Person und Organisation
            </h2>
            <p className="text-muted mt-1 text-xs">
              Kontaktdaten für Einladung, Abstimmung und Nachbereitung.
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <TextInput
              label="Vorname"
              maxLength={150}
              name="firstName"
              required
              state={state}
            />
            <TextInput
              label="Nachname"
              maxLength={150}
              name="lastName"
              required
              state={state}
            />
            <TextInput
              label="E-Mail"
              maxLength={320}
              name="email"
              required
              state={state}
              type="email"
            />
            <TextInput label="Organisation" name="organization" state={state} />
            <TextInput
              label="Rolle/Funktion"
              maxLength={200}
              name="role"
              state={state}
            />
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Einordnung</h2>
            <p className="text-muted mt-1 text-xs">
              Zielgruppe, Status und fachlicher Anknüpfungspunkt.
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <SelectInput
              label="Zielgruppe"
              name="targetGroupType"
              options={targetGroupOptions}
              state={state}
            />
            <SelectInput
              label="Status"
              name="status"
              options={statusOptions}
              state={state}
            />
            <TextInput
              label="Interessengebiet"
              maxLength={500}
              name="interestTopic"
              state={state}
            />
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">
              Teilnahme und Matchmaking
            </h2>
            <p className="text-muted mt-1 text-xs">
              Signale für Auslastung, persönliche Einladung und relevante
              Kontakte.
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div className="grid gap-3">
              <CheckboxInput
                label="Persönlich eingeladen"
                name="personallyInvited"
                state={state}
              />
              <CheckboxInput
                label="Registriert"
                name="registered"
                state={state}
              />
              <CheckboxInput
                label="Teilgenommen"
                name="attended"
                state={state}
              />
            </div>
            <div className="grid gap-5">
              <SelectInput
                label="No-Show-Risiko"
                name="noShowRisk"
                options={ratingOptions}
                state={state}
              />
              <SelectInput
                label="Matchmaking-Potenzial"
                name="matchmakingPotential"
                options={ratingOptions}
                state={state}
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Follow-up</h2>
            <p className="text-muted mt-1 text-xs">
              Nachfassbedarf und Stand der weiteren Kontaktpflege.
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <CheckboxInput
              label="Follow-up erforderlich"
              name="followUpNeeded"
              state={state}
            />
            <SelectInput
              label="Follow-up-Status"
              name="followUpStatus"
              options={followUpOptions}
              state={state}
            />
          </div>
        </Card>
      </div>

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
