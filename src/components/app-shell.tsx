import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { ActiveNavigationLink } from "@/components/active-navigation-link";
import type { IconName } from "@/components/icons";

const navigation: Array<{
  href: string;
  label: string;
  icon: IconName;
}> = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/events", label: "Events", icon: "events" },
  { href: "/tasks", label: "Aufgaben", icon: "tasks" },
  { href: "/settings", label: "Einstellungen", icon: "settings" },
];

function Brand() {
  return (
    <Link
      className="flex items-center gap-3 rounded-lg focus-visible:outline-white"
      href="/"
    >
      <span className="text-brand-900 grid size-10 shrink-0 place-items-center rounded-lg bg-white text-sm font-extrabold tracking-tight shadow-sm">
        DW
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold tracking-wide text-white">
          DIWISH
        </span>
        <span className="text-brand-200 block truncate text-xs">
          Event Operations
        </span>
      </span>
    </Link>
  );
}

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "DW"
  );
}

export function AppShell({
  children,
  currentUser,
  isLoginPage,
}: {
  children: React.ReactNode;
  currentUser: { email: string; name: string; role: string } | null;
  isLoginPage: boolean;
}) {
  if (isLoginPage) {
    return <main className="bg-surface min-h-screen">{children}</main>;
  }

  return (
    <div className="bg-surface min-h-screen">
      <aside className="app-sidebar bg-brand-950 fixed inset-y-0 left-0 z-30 hidden w-64 flex-col px-4 py-5 lg:flex">
        <div className="px-2">
          <Brand />
        </div>

        <nav aria-label="Hauptnavigation" className="mt-9 space-y-1">
          {navigation.map((item) => (
            <ActiveNavigationLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/6 p-3">
          <div className="flex items-center gap-3">
            <span className="bg-brand-700 grid size-9 place-items-center rounded-full text-xs font-bold text-white">
              {currentUser ? getInitials(currentUser.name) : "DW"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">
                {currentUser?.name ?? "Nicht angemeldet"}
              </span>
              <span className="text-brand-200 block truncate text-xs">
                {currentUser?.email ?? "Bitte anmelden"}
              </span>
            </span>
          </div>
          {currentUser ? (
            <form action={logoutAction} className="mt-3">
              <button
                className="w-full rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-left text-xs font-semibold text-white hover:bg-white/14"
                type="submit"
              >
                Abmelden
              </button>
            </form>
          ) : (
            <Link
              className="mt-3 block rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-white hover:bg-white/14"
              href="/login"
            >
              Anmelden
            </Link>
          )}
        </div>
      </aside>

      <div className="app-content lg:pl-64">
        <header className="app-mobile-header sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="bg-brand-950 flex h-16 items-center justify-between px-4">
            <Brand />
            <span className="bg-brand-700 grid size-9 place-items-center rounded-full text-xs font-bold text-white">
              {currentUser ? getInitials(currentUser.name) : "DW"}
            </span>
          </div>
          <nav
            aria-label="Mobile Hauptnavigation"
            className="flex overflow-x-auto px-1"
          >
            {navigation.map((item) => (
              <ActiveNavigationLink key={item.href} mobile {...item} />
            ))}
          </nav>
          {currentUser ? (
            <form
              action={logoutAction}
              className="border-t border-slate-200 p-3"
            >
              <button
                className="text-brand-700 text-sm font-semibold"
                type="submit"
              >
                {currentUser.name} abmelden
              </button>
            </form>
          ) : null}
        </header>

        <main className="app-main mx-auto min-h-screen w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
