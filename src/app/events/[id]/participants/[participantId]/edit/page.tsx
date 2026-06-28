import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  splitParticipantName,
  type ParticipantFormValues,
} from "@/modules/participants/participant-form";
import { getParticipantEditorData } from "@/modules/participants/queries";

import { ParticipantForm } from "../../participant-form";

export const dynamic = "force-dynamic";

export default async function EditParticipantPage({
  params,
}: {
  params: Promise<{ id: string; participantId: string }>;
}) {
  const { id, participantId } = await params;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    redirect(`/events/${id}/participants`);
  }

  const { event, participant } = await getParticipantEditorData(
    id,
    participantId,
  );

  if (!event || !participant) {
    notFound();
  }

  const name = splitParticipantName(participant.name);
  const initialValues: ParticipantFormValues = {
    eventId: event.id,
    participantId: participant.id,
    firstName: name.firstName,
    lastName: name.lastName,
    role: participant.role ?? "",
    email: participant.email,
    organization: participant.organization ?? "",
    targetGroupType: participant.targetGroupType,
    status: participant.status,
    personallyInvited: participant.personallyInvited,
    registered: participant.registered,
    attended: participant.attended,
    noShowRisk: participant.noShowRisk,
    interestTopic: participant.interestTopic ?? "",
    matchmakingPotential: participant.matchmakingPotential,
    followUpNeeded: participant.followUpNeeded,
    followUpStatus: participant.followUpStatus,
  };

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}/participants`}
      >
        ← Zurück zur Teilnehmerliste
      </Link>
      <PageHeader
        description={`Teilnehmerdaten für „${event.title}“ aktualisieren.`}
        eyebrow="Event-Teilnehmende"
        title="Person bearbeiten"
      />
      <ParticipantForm initialValues={initialValues} mode="edit" />
    </>
  );
}
