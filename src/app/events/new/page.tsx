import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";

import { EventForm } from "./event-form";

export const metadata: Metadata = {
  title: "Event anlegen",
};

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENTS)) {
    redirect("/events");
  }

  const db = getDb();
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ name: "asc" }],
  });
  const templates = await db.eventTemplate.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      _count: {
        select: {
          taskTemplates: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="mb-5">
        <Link
          className="text-brand-700 hover:text-brand-950 text-sm font-semibold"
          href="/events"
        >
          ← Zurück zur Eventliste
        </Link>
      </div>
      <PageHeader
        description="Stammdaten, Verantwortlichkeiten und optional einen vollständigen Aufgabenplan erfassen."
        eyebrow="Neues Event"
        title="Event anlegen"
      />
      <EventForm
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          taskCount: template._count.taskTemplates,
        }))}
        users={users}
      />
    </>
  );
}
