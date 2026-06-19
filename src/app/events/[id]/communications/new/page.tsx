import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getEmptyCommunicationFormValues } from "@/modules/communications/communication-form";
import { getCommunicationEditorData } from "@/modules/communications/queries";

import { CommunicationMeasureForm } from "../communication-form";

export const dynamic = "force-dynamic";

export default async function NewCommunicationMeasurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_COMMUNICATION)) {
    redirect(`/events/${id}/communications`);
  }

  const { event, users } = await getCommunicationEditorData(id);

  if (!event) {
    notFound();
  }

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}/communications`}
      >
        ← Zurück zum Kommunikationsplan
      </Link>
      <PageHeader
        description={`Neue Kommunikationsmaßnahme für „${event.title}“ planen.`}
        eyebrow="Event-Kommunikation"
        title="Maßnahme anlegen"
      />
      <CommunicationMeasureForm
        initialValues={getEmptyCommunicationFormValues(event.id)}
        mode="create"
        users={users}
      />
    </>
  );
}
