"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import type {
  ParticipantFormState,
  ParticipantFormValues,
} from "@/modules/participants/participant-form";
import {
  followUpStatusOptions,
  getFollowUpPresentation,
  getMatchmakingPresentation,
  getNoShowRiskPresentation,
  getParticipantStatusPresentation,
  getParticipantTargetGroupLabel,
  participantRatingOptions,
  participantStatusOptions,
  participantTargetGroupOptions,
} from "@/modules/participants/presentation";

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

function CheckboxField({
  label,
  name,
  state,
  description,
}: {
  label: string;
  name: "personallyInvited" | "registered" | "attended" | "followUpNeeded";
  state: ParticipantFormState;
  description: string;
}) {
  return (
    <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <input
        className="text-brand-800 mt-1 size-4 rounded border-slate-300"
        defaultChecked={state.values[name] === "on"}
        name={name}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
          {description}
        </span>
        <FieldError name={name} state={state} />
      </span>
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
  const inputClass =
    "focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";

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
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <label className="block">
              <FieldLabel required>Name</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.name}
                maxLength={300}
                name="name"
                required
                type="text"
              />
              <FieldError name="name" state={state} />
            </label>

            <label className="block">
              <FieldLabel required>E-Mail</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.email}
                maxLength={320}
                name="email"
                required
                type="email"
              />
              <FieldError name="email" state={state} />
            </label>

            <label className="block">
              <FieldLabel>Organisation</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.organization}
                maxLength={300}
                name="organization"
                type="text"
              />
              <FieldError name="organization" state={state} />
            </label>

            <label className="block">
              <FieldLabel>Rolle</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.role}
                maxLength={300}
                name="role"
                placeholder="Zum Beispiel: Geschäftsführung"
                type="text"
              />
              <FieldError name="role" state={state} />
            </label>

            <label className="block">
              <FieldLabel required>Zielgruppentyp</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.targetGroupType}
                name="targetGroupType"
                required
              >
                {participantTargetGroupOptions.map((targetGroup) => (
                  <option key={targetGroup} value={targetGroup}>
                    {getParticipantTargetGroupLabel(targetGroup)}
                  </option>
                ))}
              </select>
              <FieldError name="targetGroupType" state={state} />
            </label>

            <label className="block">
              <FieldLabel required>Status</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.status}
                name="status"
                required
              >
                {participantStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getParticipantStatusPresentation(status).label}
                  </option>
                ))}
              </select>
              <FieldError name="status" state={state} />
            </label>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">
              Teilnahme und Potenzial
            </h2>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div className="grid gap-3 md:col-span-2 lg:grid-cols-3">
              <CheckboxField
                description="Die Person wurde individuell angesprochen."
                label="Persönlich eingeladen"
                name="personallyInvited"
                state={state}
              />
              <CheckboxField
                description="Eine verbindliche Anmeldung liegt vor."
                label="Angemeldet"
                name="registered"
                state={state}
              />
              <CheckboxField
                description="Die tatsächliche Teilnahme wurde bestätigt."
                label="Teilgenommen"
                name="attended"
                state={state}
              />
            </div>

            <label className="block">
              <FieldLabel>No-Show-Risiko</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.noShowRisk}
                name="noShowRisk"
              >
                {participantRatingOptions.map((rating) => (
                  <option key={rating} value={rating}>
                    {getNoShowRiskPresentation(rating).label}
                  </option>
                ))}
              </select>
              <FieldError name="noShowRisk" state={state} />
            </label>

            <label className="block">
              <FieldLabel>Matchmaking-Potenzial</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.matchmakingPotential}
                name="matchmakingPotential"
              >
                {participantRatingOptions.map((rating) => (
                  <option key={rating} value={rating}>
                    {getMatchmakingPresentation(rating).label}
                  </option>
                ))}
              </select>
              <FieldError name="matchmakingPotential" state={state} />
            </label>

            <label className="block md:col-span-2">
              <FieldLabel>Interesse/Thema</FieldLabel>
              <textarea
                className="focus:border-brand-500 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none"
                defaultValue={state.values.interestTopic}
                maxLength={5000}
                name="interestTopic"
                rows={4}
              />
              <FieldError name="interestTopic" state={state} />
            </label>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">Follow-up</h2>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <CheckboxField
              description="Nach dem Event ist eine weitere Kontaktaufnahme sinnvoll."
              label="Follow-up nötig"
              name="followUpNeeded"
              state={state}
            />

            <label className="block">
              <FieldLabel>Follow-up Status</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.followUpStatus}
                name="followUpStatus"
              >
                {followUpStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getFollowUpPresentation(status).label}
                  </option>
                ))}
              </select>
              <FieldError name="followUpStatus" state={state} />
            </label>
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
