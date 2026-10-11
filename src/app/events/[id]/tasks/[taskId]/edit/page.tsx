import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import { getEventTaskEditorData } from "@/modules/tasks/queries";
import {
  formatTaskFormDate,
  type TaskFormValues,
} from "@/modules/tasks/task-form";

import { getTaskReturnTo } from "@/modules/tasks/list-state";

import { TaskForm } from "../../task-form";

export const dynamic = "force-dynamic";

export default async function EditEventTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id, taskId }, query] = await Promise.all([params, searchParams]);
  const returnTo = getTaskReturnTo(id, query.returnTo);
  const { event, task, users } = await getEventTaskEditorData(id, taskId);
  const currentUser = await getCurrentUser();

  if (!event || !task) {
    notFound();
  }

  if (
    !hasPermission(currentUser, Permission.UPDATE_TASK, {
      responsibleUserId: task.responsibleUserId,
    })
  ) {
    redirect(`/events/${id}/tasks`);
  }

  const canManageAllTasks = hasPermission(
    currentUser,
    Permission.MANAGE_ALL_TASKS,
  );

  const initialValues: TaskFormValues = {
    eventId: event.id,
    taskId: task.id,
    title: task.title,
    description: task.description ?? "",
    phase: task.phase,
    workPackage: task.workPackage ?? "",
    responsibleUserId: task.responsibleUserId ?? "",
    reviewerUserId: task.reviewerUserId ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: formatTaskFormDate(task.dueDate),
    isCritical: task.isCritical,
    approvalRequired: task.approvalRequired,
    shiftFollowingOpenPreparationTasks: false,
  };

  return (
    <>
      <Link
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
        href={returnTo}
      >
        ← Zurück zur Übersicht
      </Link>
      <PageHeader
        description={`Aufgabe im Event „${event.title}“ aktualisieren.`}
        eyebrow="Aufgabenplanung"
        title="Aufgabe bearbeiten"
      />
      <TaskForm
        canManageAssignment={canManageAllTasks}
        initialValues={initialValues}
        mode="edit"
        returnTo={returnTo}
        users={users}
      />
    </>
  );
}
