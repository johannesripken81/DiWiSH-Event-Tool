import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getEmptyParticipantFormValues } from "@/modules/participants/participant-form";
import { getParticipantEditorData } from "@/modules/participants/queries";

import { ParticipantForm } from "../participant-form";

export const dynamic = "force-dynamic";

export default async function NewParticipantPage({
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
        description={`Neue Person für „${event.title}“ erfassen.`}
        eyebrow="Event-Teilnehmende"
        title="Person anlegen"
      />
      <ParticipantForm
        initialValues={getEmptyParticipantFormValues(event.id)}
        mode="create"
      />
    </>
  );
}
