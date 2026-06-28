import type { Metadata } from "next";
import { headers } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import { getOptionalCurrentUser } from "@/lib/current-user";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DIWISH Event Operations",
    template: "%s | DIWISH Event Operations",
  },
  description:
    "Gemeinsame Planung, Durchführung und Nachbereitung von DIWISH-Veranstaltungen.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, requestHeaders] = await Promise.all([
    getOptionalCurrentUser(),
    headers(),
  ]);
  const pathname = requestHeaders.get("x-pathname") ?? "";

  return (
    <html lang="de">
      <body>
        <WebVitalsReporter />
        <AppShell
          currentUser={
            currentUser
              ? {
                  email: currentUser.email,
                  name: currentUser.name,
                  role: currentUser.role,
                }
              : null
          }
          isLoginPage={pathname.startsWith("/login")}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
