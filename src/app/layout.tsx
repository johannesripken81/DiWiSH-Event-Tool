import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
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
  const currentUser = await getOptionalCurrentUser();

  return (
    <html lang="de">
      <body>
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
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
