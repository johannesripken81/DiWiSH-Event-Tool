import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui";
import { getOptionalCurrentUser } from "@/lib/current-user";

import { loginAction } from "./actions";

export const metadata: Metadata = {
  title: "Anmelden",
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMessage(query: SearchParams) {
  if (firstValue(query.error) === "invalid") {
    return {
      tone: "red",
      text: "Anmeldung fehlgeschlagen. Bitte E-Mail/Name und Passwort prüfen.",
    } as const;
  }

  if (firstValue(query.loggedOut) === "1") {
    return {
      tone: "green",
      text: "Du wurdest abgemeldet.",
    } as const;
  }

  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const currentUser = await getOptionalCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  const query = await searchParams;
  const message = getMessage(query);
  const returnTo = firstValue(query.returnTo) ?? "/";

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="bg-brand-950 px-6 py-7 text-white">
          <div className="flex items-center gap-3">
            <span className="text-brand-900 grid size-11 shrink-0 place-items-center rounded-xl bg-white text-sm font-extrabold tracking-tight shadow-sm">
              DW
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide">DIWISH</p>
              <p className="text-brand-200 text-xs">Event Operations</p>
            </div>
          </div>
          <h1 className="mt-7 text-2xl font-bold tracking-tight">Anmelden</h1>
          <p className="text-brand-100 mt-2 text-sm leading-6">
            Melde dich mit deinem Namen oder deiner E-Mail-Adresse und deinem
            Passwort an.
          </p>
        </div>

        <form action={loginAction} className="space-y-4 p-6">
          <input name="returnTo" type="hidden" value={returnTo} />

          {message ? (
            <div
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                message.tone === "green"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
              role="status"
            >
              {message.text}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Name oder E-Mail
            </span>
            <input
              autoComplete="username"
              autoFocus
              className="focus:border-brand-500 mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none"
              name="identifier"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Passwort
            </span>
            <input
              autoComplete="current-password"
              className="focus:border-brand-500 mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none"
              name="password"
              required
              type="password"
            />
          </label>

          <button
            className="bg-brand-900 hover:bg-brand-800 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition"
            type="submit"
          >
            Anmelden
          </button>

          <p className="text-xs leading-5 text-slate-500">
            Falls du noch kein Passwort hast, kann ein Admin dein Passwort in
            den Einstellungen setzen.
          </p>
        </form>
      </Card>
    </div>
  );
}
