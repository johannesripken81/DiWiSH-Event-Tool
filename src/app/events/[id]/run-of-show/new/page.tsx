import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getRunOfShowEditorData } from "@/modules/run-of-show/queries";
import { getEmptyRunOfShowFormValues } from "@/modules/run-of-show/run-of-show-form";

import { RunOfShowForm } from "../run-of-show-form";

export const dynamic = "force-dynamic";

export default async function NewRunOfShowItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_EVENT_OPERATIONS)) {
    redirect(`/events/${id}/run-of-show`);
  }

  const { event, users } = await getRunOfShowEditorData(id);

  if (!event) {
    notFound();
  }

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}/run-of-show`}
      >
        ← Zurück zum Regieplan
      </Link>
      <PageHeader
        description={`Neuen Programmpunkt für „${event.title}“ planen.`}
        eyebrow="Ablauf & Regie"
        title="Programmpunkt anlegen"
      />
      <RunOfShowForm
        initialValues={getEmptyRunOfShowFormValues(event.id)}
        mode="create"
        users={users}
      />
    </>
  );
}
