"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import type {
  EvaluationFormState,
  EvaluationFormValues,
} from "@/modules/evaluations/evaluation-form";
import {
  calculateNoShowRate,
  formatNoShowRate,
} from "@/modules/evaluations/metrics";

import { saveEvaluationAction } from "./actions";

function FieldError({
  name,
  state,
}: {
  name: keyof EvaluationFormValues;
  state: EvaluationFormState;
}) {
  const errors = state.fieldErrors[name];

  return errors?.length ? (
    <p className="mt-1.5 text-xs font-semibold text-red-700">{errors[0]}</p>
  ) : null;
}

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
      {children}
      {hint ? (
        <span className="ml-1 font-normal text-slate-500">({hint})</span>
      ) : null}
    </span>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Evaluation wird gespeichert..." : "Evaluation speichern"}
    </button>
  );
}

function toOptionalNumber(value: string) {
  return value === "" ? null : Number(value);
}

function LearningField({
  label,
  name,
  state,
  placeholder,
}: {
  label: string;
  name:
    | "qualitativeLearnings"
    | "wentWell"
    | "wasDifficult"
    | "nextTimeDifferent";
  state: EvaluationFormState;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        className="focus:border-brand-500 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none"
        defaultValue={state.values[name]}
        maxLength={10_000}
        name={name}
        placeholder={placeholder}
        rows={5}
      />
      <FieldError name={name} state={state} />
    </label>
  );
}

export function EvaluationForm({
  initialValues,
}: {
  initialValues: EvaluationFormValues;
}) {
  const [state, formAction] = useActionState(saveEvaluationAction, {
    values: initialValues,
    fieldErrors: {},
  });
  const [registrations, setRegistrations] = useState(
    initialValues.registrations,
  );
  const [attendees, setAttendees] = useState(initialValues.attendees);
  const noShowRate = calculateNoShowRate(
    toOptionalNumber(registrations),
    toOptionalNumber(attendees),
  );
  const inputClass =
    "focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";

  return (
    <form action={formAction} noValidate>
      <input name="eventId" type="hidden" value={state.values.eventId} />

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
            <h2 className="text-brand-950 font-bold">Teilnahme und Resonanz</h2>
            <p className="mt-1 text-xs text-slate-500">
              Quantitative Kennzahlen und unmittelbare Wirkung des Events
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <FieldLabel>Anzahl Anmeldungen</FieldLabel>
              <input
                className={inputClass}
                min="0"
                name="registrations"
                onChange={(event) => setRegistrations(event.target.value)}
                step="1"
                type="number"
                value={registrations}
              />
              <FieldError name="registrations" state={state} />
            </label>

            <label className="block">
              <FieldLabel>Anzahl Teilnehmende</FieldLabel>
              <input
                className={inputClass}
                min="0"
                name="attendees"
                onChange={(event) => setAttendees(event.target.value)}
                step="1"
                type="number"
                value={attendees}
              />
              <FieldError name="attendees" state={state} />
            </label>

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">
                No-Show-Quote
              </p>
              <p className="mt-2 text-xl font-bold text-blue-950">
                {formatNoShowRate(noShowRate)}
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                Wird automatisch aus Anmeldungen und Teilnehmenden berechnet.
              </p>
            </div>

            <label className="block">
              <FieldLabel hint="1 bis 5">Zielgruppenfit</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.targetAudienceFit}
                name="targetAudienceFit"
              >
                <option value="">Nicht bewertet</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} von 5
                  </option>
                ))}
              </select>
              <FieldError name="targetAudienceFit" state={state} />
            </label>

            <label className="block">
              <FieldLabel hint="1 bis 5">Zufriedenheit</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.satisfaction}
                max="5"
                min="1"
                name="satisfaction"
                step="0.1"
                type="number"
              />
              <FieldError name="satisfaction" state={state} />
            </label>

            <label className="block">
              <FieldLabel hint="-100 bis 100">Net Promoter Score</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.netPromoterScore}
                max="100"
                min="-100"
                name="netPromoterScore"
                step="1"
                type="number"
              />
              <FieldError name="netPromoterScore" state={state} />
            </label>

            {(
              [
                ["Neue Kontakte", "newContacts"],
                ["Kooperationsansätze", "cooperationApproaches"],
                ["Folgegespräche", "followUpConversations"],
              ] as const
            ).map(([label, name]) => (
              <label className="block" key={name}>
                <FieldLabel>{label}</FieldLabel>
                <input
                  className={inputClass}
                  defaultValue={state.values[name]}
                  min="0"
                  name={name}
                  step="1"
                  type="number"
                />
                <FieldError name={name} state={state} />
              </label>
            ))}

            <label className="block">
              <FieldLabel>Wiederholen?</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.repeatEvent}
                name="repeatEvent"
              >
                <option value="">Noch offen</option>
                <option value="yes">Ja</option>
                <option value="no">Nein</option>
              </select>
              <FieldError name="repeatEvent" state={state} />
            </label>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">
              Learnings und nächste Schritte
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Erkenntnisse so festhalten, dass das nächste Event davon
              profitiert
            </p>
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <LearningField
              label="Qualitative Learnings"
              name="qualitativeLearnings"
              placeholder="Zentrale Beobachtungen, Rückmeldungen und Wirkung"
              state={state}
            />
            <LearningField
              label="Was lief gut?"
              name="wentWell"
              state={state}
            />
            <LearningField
              label="Was war schwierig?"
              name="wasDifficult"
              state={state}
            />
            <LearningField
              label="Was machen wir beim nächsten Mal anders?"
              name="nextTimeDifferent"
              state={state}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          href={`/events/${state.values.eventId}`}
        >
          Zurück zum Cockpit
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
