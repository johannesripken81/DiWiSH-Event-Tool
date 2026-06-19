import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatCommunicationFormDate,
  type CommunicationFormValues,
} from "@/modules/communications/communication-form";
import { getCommunicationEditorData } from "@/modules/communications/queries";

import { CommunicationMeasureForm } from "../../communication-form";

export const dynamic = "force-dynamic";

export default async function EditCommunicationMeasurePage({
  params,
}: {
  params: Promise<{ id: string; measureId: string }>;
}) {
  const { id, measureId } = await params;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_COMMUNICATION)) {
    redirect(`/events/${id}/communications`);
  }

  const { event, measure, users } = await getCommunicationEditorData(
    id,
    measureId,
  );

  if (!event || !measure) {
    notFound();
  }

  const initialValues: CommunicationFormValues = {
    eventId: event.id,
    measureId: measure.id,
    channel: measure.channel,
    targetAudience: measure.targetAudience,
    message: measure.message,
    format: measure.format,
    responsibleUserId: measure.responsibleUserId ?? "",
    publicationDate: formatCommunicationFormDate(measure.publicationDate),
    approvalStatus: measure.approvalStatus,
    assetUrl: measure.assetUrl ?? "",
    clicks: String(measure.clicks),
    registrations: String(measure.registrations),
    reach: String(measure.reach),
    comments: measure.comments ?? "",
  };

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}/communications`}
      >
        ← Zurück zum Kommunikationsplan
      </Link>
      <PageHeader
        description={`Kommunikationsmaßnahme für „${event.title}“ aktualisieren.`}
        eyebrow="Event-Kommunikation"
        title="Maßnahme bearbeiten"
      />
      <CommunicationMeasureForm
        initialValues={initialValues}
        mode="edit"
        users={users}
      />
    </>
  );
}
