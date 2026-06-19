import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getEmptyTaskFormValues } from "@/modules/tasks/task-form";
import { getEventTaskEditorData } from "@/modules/tasks/queries";

import { TaskForm } from "../task-form";

export const dynamic = "force-dynamic";

export default async function NewEventTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!hasPermission(currentUser, Permission.MANAGE_ALL_TASKS)) {
    redirect(`/events/${id}/tasks`);
  }

  const { event, users } = await getEventTaskEditorData(id);

  if (!event) {
    notFound();
  }

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={`/events/${event.id}/tasks`}
      >
        ← Zurück zur Aufgabenplanung
      </Link>
      <PageHeader
        description={`Neue Aufgabe für „${event.title}“ erfassen und zuweisen.`}
        eyebrow="Aufgabenplanung"
        title="Aufgabe anlegen"
      />
      <TaskForm
        initialValues={getEmptyTaskFormValues(event.id)}
        mode="create"
        users={users}
      />
    </>
  );
}
