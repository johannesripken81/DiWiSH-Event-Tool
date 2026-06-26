import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  getCachedEventTemplateOptions,
  getCachedUserOptions,
} from "@/modules/settings/reference-data";

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

  const [users, templates] = await Promise.all([
    getCachedUserOptions(),
    getCachedEventTemplateOptions(),
  ]);

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
