import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRunOfShowEditorData } from "@/modules/run-of-show/queries";
import {
  formatRunOfShowFormTime,
  type RunOfShowFormValues,
} from "@/modules/run-of-show/run-of-show-form";

import { RunOfShowForm } from "../../run-of-show-form";

export const dynamic = "force-dynamic";

export default async function EditRunOfShowItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    redirect(`/events/${id}/run-of-show`);
  }

  const { event, item, users } = await getRunOfShowEditorData(id, itemId);

  if (!event || !item) {
    notFound();
  }

  const initialValues: RunOfShowFormValues = {
    eventId: event.id,
    itemId: item.id,
    startTime: formatRunOfShowFormTime(item.startTime),
    endTime: formatRunOfShowFormTime(item.endTime),
    programItem: item.programItem,
    goal: item.goal ?? "",
    method: item.method ?? "",
    responsibleUserId: item.responsibleUserId ?? "",
    material: item.material ?? "",
    risk: item.risk ?? "",
    transitionNote: item.transitionNote ?? "",
  };

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}/run-of-show`}
      >
        ← Zurück zum Regieplan
      </Link>
      <PageHeader
        description={`Programmpunkt für „${event.title}“ aktualisieren.`}
        eyebrow="Ablauf & Regie"
        title="Programmpunkt bearbeiten"
      />
      <RunOfShowForm initialValues={initialValues} mode="edit" users={users} />
    </>
  );
}
