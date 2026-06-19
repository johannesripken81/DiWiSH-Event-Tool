import { EventPhase, TaskPriority, UserRole } from "@/generated/prisma/enums";
import {
  eventPhaseOptions,
  getPhaseLabel,
  getTaskPriorityPresentation,
  taskPriorityOptions,
} from "@/modules/events/presentation";

export const inputClass =
  "focus:border-brand-500 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none";
export const textareaClass =
  "focus:border-brand-500 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none";
export const primaryButtonClass =
  "bg-brand-900 hover:bg-brand-800 inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white";
export const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50";
export const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  EVENT_LEAD: "Event Lead",
  COMMUNICATION: "Kommunikation",
  TEAM_MEMBER: "Teammitglied",
  GUEST: "Gast",
};

export const notificationLabels = [
  {
    name: "dueIn7DaysEnabled",
    title: "7 Tage vor Fälligkeit",
    description: "Interne Erinnerung für verantwortliche Personen erzeugen.",
  },
  {
    name: "dueIn3DaysEnabled",
    title: "3 Tage vor Fälligkeit",
    description: "Zusätzliche Erinnerung kurz vor dem Termin erzeugen.",
  },
  {
    name: "dueTodayEnabled",
    title: "Am Fälligkeitstag",
    description: "Aufgaben markieren, die heute erledigt werden müssen.",
  },
  {
    name: "overdueOneDayEnabled",
    title: "1 Tag überfällig",
    description: "Hinweis erzeugen, wenn eine Aufgabe gestern fällig war.",
  },
  {
    name: "criticalOverdueEnabled",
    title: "Kritische Aufgabe überfällig",
    description: "Eskalation an Event Lead oder zuständige Prüfung erzeugen.",
  },
] as const;

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-bold text-slate-600">
      {children}
    </span>
  );
}

export function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-800">
        {value || (
          <span className="font-normal text-slate-400">Nicht gesetzt</span>
        )}
      </div>
    </div>
  );
}

export function EditableDetails({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
        <span>
          {title}
          {description ? (
            <span className="mt-1 block text-xs leading-5 font-normal text-slate-500">
              {description}
            </span>
          ) : null}
        </span>
        <span className="text-brand-700 text-xs font-bold group-open:hidden">
          Öffnen
        </span>
        <span className="text-brand-700 hidden text-xs font-bold group-open:inline">
          Schließen
        </span>
      </summary>
      <div className="border-t border-slate-200 p-4">{children}</div>
    </details>
  );
}

export function CheckboxSetting({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <input
        className="text-brand-800 mt-0.5 size-4 rounded border-slate-300"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

export function RoleSelect({
  defaultValue,
  disabled = false,
  name = "role",
}: {
  defaultValue: UserRole;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <select
      className={inputClass}
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
    >
      {Object.values(UserRole).map((role) => (
        <option key={role} value={role}>
          {roleLabels[role]}
        </option>
      ))}
    </select>
  );
}

export function PhaseSelect({
  defaultValue,
  disabled = false,
  name = "phase",
}: {
  defaultValue: EventPhase;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <select
      className={inputClass}
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
    >
      {eventPhaseOptions.map((phase) => (
        <option key={phase} value={phase}>
          {getPhaseLabel(phase)}
        </option>
      ))}
    </select>
  );
}

export function PrioritySelect({
  defaultValue,
  disabled = false,
  name = "priority",
}: {
  defaultValue: TaskPriority;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <select
      className={inputClass}
      defaultValue={defaultValue}
      disabled={disabled}
      name={name}
    >
      {taskPriorityOptions.map((priority) => (
        <option key={priority} value={priority}>
          {getTaskPriorityPresentation(priority).label}
        </option>
      ))}
    </select>
  );
}

export function ReviewerRoleSelect({
  defaultValue,
  disabled = false,
  name = "defaultReviewerRole",
}: {
  defaultValue: UserRole | null;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <select
      className={inputClass}
      defaultValue={defaultValue ?? ""}
      disabled={disabled}
      name={name}
    >
      <option value="">Keine Prüfung</option>
      {Object.values(UserRole).map((role) => (
        <option key={role} value={role}>
          {roleLabels[role]}
        </option>
      ))}
    </select>
  );
}
