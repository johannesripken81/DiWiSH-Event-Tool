"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import { UserRole } from "@/generated/prisma/enums";
import {
  eventPhaseOptions,
  getPhaseLabel,
  getTaskPriorityPresentation,
  getTaskStatusPresentation,
  taskPriorityOptions,
  taskStatusOptions,
} from "@/modules/events/presentation";
import type { TaskFormState, TaskFormValues } from "@/modules/tasks/task-form";

import { createTaskAction, updateTaskAction } from "./actions";

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
  name: keyof TaskFormValues;
  state: TaskFormState;
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
        ? "Aufgabe wird gespeichert..."
        : mode === "create"
          ? "Aufgabe anlegen"
          : "Änderungen speichern"}
    </button>
  );
}

export function TaskForm({
  canManageAssignment = true,
  initialValues,
  mode,
  users,
}: {
  canManageAssignment?: boolean;
  initialValues: TaskFormValues;
  mode: "create" | "edit";
  users: UserOption[];
}) {
  const action = mode === "create" ? createTaskAction : updateTaskAction;
  const [state, formAction] = useActionState(action, {
    values: initialValues,
    fieldErrors: {},
  });
  const inputClass =
    "focus:border-brand-500 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";
  const responsibleUser = users.find(
    (user) => user.id === state.values.responsibleUserId,
  );
  const reviewerUser = users.find(
    (user) => user.id === state.values.reviewerUserId,
  );

  return (
    <form action={formAction} noValidate>
      <input name="eventId" type="hidden" value={state.values.eventId} />
      <input name="taskId" type="hidden" value={state.values.taskId} />

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
            <h2 className="text-brand-950 font-bold">Aufgabendetails</h2>
            <p className="mt-1 text-xs text-slate-500">
              Inhalt, Phase und Termin der Aufgabe
            </p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <FieldLabel required>Aufgabe</FieldLabel>
              <input
                className={inputClass}
                defaultValue={state.values.title}
                maxLength={200}
                name="title"
                required
                type="text"
              />
              <FieldError name="title" state={state} />
            </label>

            <label className="block md:col-span-2">
              <FieldLabel>Beschreibung</FieldLabel>
              <textarea
                className="focus:border-brand-500 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none"
                defaultValue={state.values.description}
                maxLength={5000}
                name="description"
                rows={4}
              />
              <FieldError name="description" state={state} />
            </label>

            {canManageAssignment ? (
              <label className="block">
                <FieldLabel required>Phase</FieldLabel>
                <select
                  className={inputClass}
                  defaultValue={state.values.phase}
                  name="phase"
                  required
                >
                  {eventPhaseOptions.map((phase) => (
                    <option key={phase} value={phase}>
                      {getPhaseLabel(phase)}
                    </option>
                  ))}
                </select>
                <FieldError name="phase" state={state} />
              </label>
            ) : (
              <div>
                <FieldLabel>Verantwortlich</FieldLabel>
                <input
                  name="responsibleUserId"
                  type="hidden"
                  value={state.values.responsibleUserId}
                />
                <p className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  {responsibleUser?.name ?? "Nicht zugewiesen"}
                </p>
              </div>
            )}

            {canManageAssignment ? (
              <label className="block">
                <FieldLabel>Fällig am</FieldLabel>
                <input
                  className={inputClass}
                  defaultValue={state.values.dueDate}
                  name="dueDate"
                  type="date"
                />
                <FieldError name="dueDate" state={state} />
              </label>
            ) : (
              <div>
                <FieldLabel>Prüfer/in</FieldLabel>
                <input
                  name="reviewerUserId"
                  type="hidden"
                  value={state.values.reviewerUserId}
                />
                <p className="min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  {reviewerUser?.name ?? "Nicht zugewiesen"}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-brand-950 font-bold">
              Verantwortung und Steuerung
            </h2>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2">
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
              <FieldLabel>Prüfer/in</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.reviewerUserId}
                name="reviewerUserId"
              >
                <option value="">Nicht zugewiesen</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {roleLabels[user.role]}
                  </option>
                ))}
              </select>
              <FieldError name="reviewerUserId" state={state} />
            </label>

            <label className="block">
              <FieldLabel required>Status</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.status}
                name="status"
                required
              >
                {taskStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getTaskStatusPresentation(status).label}
                  </option>
                ))}
              </select>
              <FieldError name="status" state={state} />
            </label>

            <label className="block">
              <FieldLabel required>Priorität</FieldLabel>
              <select
                className={inputClass}
                defaultValue={state.values.priority}
                name="priority"
                required
              >
                {taskPriorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {getTaskPriorityPresentation(priority).label}
                  </option>
                ))}
              </select>
              <FieldError name="priority" state={state} />
            </label>

            {canManageAssignment ? (
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input
                  className="text-brand-800 mt-0.5 size-4 rounded border-slate-300"
                  defaultChecked={state.values.isCritical}
                  name="isCritical"
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Kritische Aufgabe
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Im Cockpit und in Filtern besonders hervorheben.
                  </span>
                </span>
              </label>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input
                  name="isCritical"
                  type="hidden"
                  value={state.values.isCritical ? "on" : ""}
                />
                <span className="block text-sm font-semibold text-slate-800">
                  Kritische Aufgabe
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {state.values.isCritical ? "Ja" : "Nein"}
                </span>
              </div>
            )}

            {canManageAssignment ? (
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input
                  className="text-brand-800 mt-0.5 size-4 rounded border-slate-300"
                  defaultChecked={state.values.approvalRequired}
                  name="approvalRequired"
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    Prüfung erforderlich
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Eine zweite Person soll das Ergebnis der Aufgabe prüfen.
                  </span>
                </span>
              </label>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input
                  name="approvalRequired"
                  type="hidden"
                  value={state.values.approvalRequired ? "on" : ""}
                />
                <span className="block text-sm font-semibold text-slate-800">
                  Prüfung erforderlich
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {state.values.approvalRequired ? "Ja" : "Nein"}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          href={`/events/${state.values.eventId}/tasks`}
        >
          Abbrechen
        </Link>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
