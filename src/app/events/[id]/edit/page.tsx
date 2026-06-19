import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatEventFormDate,
  formatEventFormTime,
  type EventFormState,
} from "@/modules/events/create-event";

import { EventForm } from "../../new/event-form";
import { deleteEventAction } from "../../new/actions";

export const metadata: Metadata = {
  title: "Event bearbeiten",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDeleteMessage(query: SearchParams) {
  const deleteStatus = firstValue(query.delete);

  if (deleteStatus === "confirm") {
    return "Der eingegebene Eventtitel stimmt nicht. Bitte den Titel exakt eingeben.";
  }

  if (deleteStatus === "denied") {
    return "Du hast keine Berechtigung, dieses Event zu löschen.";
  }

  if (deleteStatus === "failed") {
    return "Das Event konnte nicht gelöscht werden. Bitte versuche es erneut.";
  }

  return null;
}

function DeleteEventPanel({
  eventId,
  eventTitle,
  message,
}: {
  eventId: string;
  eventTitle: string;
  message: string | null;
}) {
  return (
    <Card className="border-red-200">
      <div className="border-b border-red-100 px-5 py-4">
        <h2 className="font-bold text-red-800">Event löschen</h2>
        <p className="mt-1 text-xs leading-5 text-red-700">
          Löschen entfernt dieses Event inklusive Aufgaben, Kommunikationsplan,
          Evaluation und Teilnehmenden. Diese Aktion ist nicht rückgängig zu
          machen.
        </p>
      </div>
      <div className="p-5">
        {message ? (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {message}
          </div>
        ) : null}
        <details className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <summary className="cursor-pointer text-sm font-bold text-red-800">
            Löschformular öffnen
          </summary>
          <form action={deleteEventAction} className="mt-4 space-y-4">
            <input name="eventId" type="hidden" value={eventId} />
            <label className="block">
              <span className="text-sm font-semibold text-red-900">
                Zur Bestätigung bitte den Eventtitel exakt eingeben
              </span>
              <input
                className="mt-1 min-h-11 w-full rounded-lg border border-red-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-red-600"
                name="confirmationTitle"
                placeholder={eventTitle}
                required
              />
            </label>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
              type="submit"
            >
              Event endgültig löschen
            </button>
          </form>
        </details>
      </div>
    </Card>
  );
}

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
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
      <div className="mt-8">
        <DeleteEventPanel
          eventId={event.id}
          eventTitle={event.title}
          message={getDeleteMessage(query)}
        />
      </div>
    </>
  );
}
