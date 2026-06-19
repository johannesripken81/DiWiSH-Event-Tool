import Link from "next/link";

import { Icon } from "@/components/icons";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? (
          <p className="text-brand-700 mb-2 text-xs font-bold tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-brand-950 text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-6 sm:text-base">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({
  children,
  icon = true,
}: {
  children: React.ReactNode;
  icon?: boolean;
}) {
  return (
    <button
      className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
      type="button"
    >
      {icon ? <Icon className="size-4" name="plus" /> : null}
      {children}
    </button>
  );
}

export function PrimaryLink({
  children,
  href,
  icon = true,
}: {
  children: React.ReactNode;
  href: string;
  icon?: boolean;
}) {
  return (
    <Link
      className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
      href={href}
    >
      {icon ? <Icon className="size-4" name="plus" /> : null}
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`shadow-card rounded-xl border border-slate-200 bg-white ${className}`}
    >
      {children}
    </section>
  );
}

const statusClasses = {
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  gray: "bg-slate-100 text-slate-700 ring-slate-600/15",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  yellow: "bg-amber-50 text-amber-800 ring-amber-600/25",
};

export type StatusColor = keyof typeof statusClasses;

export function StatusBadge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: StatusColor;
}) {
  return (
    <span
      className={`inline-flex min-w-max items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[color]}`}
    >
      {children}
    </span>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="bg-brand-50 text-brand-700 grid size-12 place-items-center rounded-full">
        <Icon className="size-6" name="events" />
      </span>
      <h2 className="text-brand-950 mt-4 text-base font-bold">{title}</h2>
      <p className="text-muted mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
