import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatEventFormDate,
  formatEventFormTime,
  type EventFormState,
} from "@/modules/events/create-event";

import { EventForm } from "../../new/event-form";

export const metadata: Metadata = {
  title: "Event bearbeiten",
};

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENTS)) {
    redirect(`/events/${id}`);
  }

  const db = getDb();
  const event = await db.event.findUnique({
    where: { id },
  });
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  if (!event) {
    notFound();
  }

  const initialState: EventFormState = {
    values: {
      eventId: event.id,
      title: event.title,
      description: event.description ?? "",
      eventDate: formatEventFormDate(event.eventDate),
      startTime: formatEventFormTime(event.startTime),
      endTime: formatEventFormTime(event.endTime),
      location: event.location ?? "",
      format: event.format ?? "",
      goal: event.goal ?? "",
      targetAudience: event.targetAudience ?? "",
      eventLeadId: event.eventLeadId ?? "",
      coLeadId: event.coLeadId ?? "",
      communicationOwnerId: event.communicationOwnerId ?? "",
      budgetFrame: event.budgetFrame?.toString() ?? "",
      participantGoal: event.participantGoal?.toString() ?? "",
      registrationUrl: event.registrationUrl ?? "",
      feedbackFormUrl: event.feedbackFormUrl ?? "",
      eventTemplateId: "",
    },
    fieldErrors: {},
  };

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}`}
      >
        ← Zurück zum Event-Cockpit
      </Link>
      <PageHeader
        description="Stammdaten, Verantwortlichkeiten und zentrale Links aktualisieren."
        eyebrow="Event-Operations"
        title="Event bearbeiten"
      />
      <EventForm
        initialState={initialState}
        mode="edit"
        templates={[]}
        users={users}
      />
    </>
  );
}
