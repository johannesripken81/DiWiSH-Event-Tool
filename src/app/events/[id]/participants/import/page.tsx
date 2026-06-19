import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getParticipantEditorData } from "@/modules/participants/queries";

import { ParticipantImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImportParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    redirect(`/events/${id}/participants`);
  }

  const { event } = await getParticipantEditorData(id);

  if (!event) {
    notFound();
  }

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}/participants`}
      >
        ← Zurück zur Teilnehmerliste
      </Link>
      <PageHeader
        description={`CSV-Datei für „${event.title}“ importieren und Spalten zuordnen.`}
        eyebrow="Event-Teilnehmende"
        title="CSV-Import"
      />
      <ParticipantImportForm eventId={event.id} />
    </>
  );
}
