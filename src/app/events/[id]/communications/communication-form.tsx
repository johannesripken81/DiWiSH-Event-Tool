"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import { UserRole } from "@/generated/prisma/enums";
import type {
  CommunicationFormState,
  CommunicationFormValues,
} from "@/modules/communications/communication-form";
import {
  communicationApprovalStatusOptions,
  communicationChannelOptions,
  getCommunicationApprovalPresentation,
  getCommunicationChannelLabel,
} from "@/modules/communications/presentation";

import {
  createCommunicationMeasureAction,
  updateCommunicationMeasureAction,
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
  name: keyof CommunicationFormValues;
  state: CommunicationFormState;
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
        ? "Maßnahme wird gespeichert..."
        : mode === "create"
          ? "Maßnahme anlegen"
          : "Änderungen speichern"}
    </button>
  );
}

export function CommunicationMeasureForm({
  initialValues,
  mode,
  users,
}: {
  initialValues: CommunicationFormValues;
  mode: "create" | "edit";
  users: UserOption[];
}) {
  const action =
    mode === "create"
      ? createCommunicationMeasureAction
      : updateCommunicationMeasureAction;
  const [state, formAction] = useActionState(action, {
    values: initialValues,
    fieldErrors: {},
  });
  const inputClass =
    "focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";

  return (
    <form action={formAction} noValidate>
      <input name="eventId" type="hidden" value={state.values.eventId} />
      <input name="measureId" type="hidden" value={state.values.measureId} />

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
            <h2 className="text-brand-950 font-bold">Kommunikationsmaßnahme</h2>
            <p className="mt-1 text-xs text-slate-500">
              Inhalt, Kanal und Veröffentlichung planen
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <label className="block">
              <FieldLabel required>Kanal</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.channel}
                name="channel"
                required
              >
                {communicationChannelOptions.map((channel) => (
                  <option key={channel} value={channel}>
                    {getCommunicationChannelLabel(channel)}
                  </option>
                ))}
              </select>
              <FieldError name="channel" state={state} />
            </label>

            <label className="block">
              <FieldLabel required>Format</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.format}
                maxLength={200}
                name="format"
                placeholder="Zum Beispiel: Post, Artikel oder E-Mail"
                required
                type="text"
              />
              <FieldError name="format" state={state} />
            </label>

            <label className="block md:col-span-2">
              <FieldLabel required>Zielgruppe</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.targetAudience}
                maxLength={1000}
                name="targetAudience"
                required
                type="text"
              />
              <FieldError name="targetAudience" state={state} />
            </label>

            <label className="block md:col-span-2">
              <FieldLabel required>Botschaft</FieldLabel>
              <textarea
                className="focus:border-brand-500 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none"
                defaultValue={state.values.message}
                maxLength={5000}
                name="message"
                required
                rows={5}
              />
              <FieldError name="message" state={state} />
            </label>

            <label className="block">
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

            <label className="block">
              <FieldLabel required>Veröffentlichungsdatum</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.publicationDate}
                name="publicationDate"
                required
                type="date"
              />
              <FieldError name="publicationDate" state={state} />
            </label>

            <label className="block">
              <FieldLabel required>Freigabestatus</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.approvalStatus}
                name="approvalStatus"
                required
              >
                {communicationApprovalStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getCommunicationApprovalPresentation(status).label}
                  </option>
                ))}
              </select>
              <FieldError name="approvalStatus" state={state} />
            </label>

            <label className="block">
              <FieldLabel>Link zum Asset</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.assetUrl}
                name="assetUrl"
                placeholder="https://..."
                type="url"
              />
              <FieldError name="assetUrl" state={state} />
            </label>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">
              Wirkung und Dokumentation
            </h2>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-3">
            {(
              [
                ["Klicks", "clicks"],
                ["Anmeldungen", "registrations"],
                ["Reichweite", "reach"],
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

            <label className="block md:col-span-3">
              <FieldLabel>Kommentare</FieldLabel>
              <textarea
                className="focus:border-brand-500 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none"
                defaultValue={state.values.comments}
                maxLength={5000}
                name="comments"
                rows={4}
              />
              <FieldError name="comments" state={state} />
            </label>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          href={`/events/${state.values.eventId}/communications`}
        >
          Abbrechen
        </Link>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
