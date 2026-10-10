import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, PageHeader, PrimaryLink, StatusBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/current-user";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatDate,
  getPhaseLabel,
  getTaskPriorityPresentation,
  getTaskStatusPresentation,
} from "@/modules/events/presentation";
import { getTaskHref, getTaskReturnTo } from "@/modules/tasks/list-state";
import { getEventTaskEditorData } from "@/modules/tasks/queries";

import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TaskStatus } from "@/generated/prisma/enums";
import { approveTaskAction } from "../actions";

import { getWorkPackageLabel } from "@/modules/tasks/work-packages";

export const dynamic = "force-dynamic";

export default async function EventTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id, taskId }, query] = await Promise.all([params, searchParams]);
  const { event, task, users } = await getEventTaskEditorData(id, taskId);
  const currentUser = await getCurrentUser();
  if (!event || !task) notFound();
  const returnTo = getTaskReturnTo(id, query.returnTo);
  const status = getTaskStatusPresentation(task.status);
  const priority = getTaskPriorityPresentation(task.priority);
  const canEdit = hasPermission(currentUser, Permission.UPDATE_TASK, {
    responsibleUserId: task.responsibleUserId,
  });
  const details = [
    ["Phase", getPhaseLabel(task.phase)],
    ["Arbeitspaket", getWorkPackageLabel(task.workPackage)],
    [
      "Verantwortlich",
      users.find((user) => user.id === task.responsibleUserId)?.name ??
        "Nicht zugewiesen",
    ],
    [
      "Prüfer/in",
      users.find((user) => user.id === task.reviewerUserId)?.name ??
        "Nicht zugewiesen",
    ],
    ["Fällig am", formatDate(task.dueDate)],
    ["Für das Event kritisch", task.isCritical ? "Ja" : "Nein"],
    ["Prüfung erforderlich", task.approvalRequired ? "Ja" : "Nein"],
    [
      "Freigabe",
      task.approvedAt
        ? "Freigegeben am " + formatDate(task.approvedAt)
        : task.approvalRequired
          ? "Ausstehend"
          : "Nicht erforderlich",
    ],
  ];

  return (
    <>
      <Link
        href={returnTo}
        className="text-brand-700 hover:text-brand-950 mb-5 inline-flex text-sm font-semibold"
      >
        ← Zurück zur Übersicht
      </Link>
      <PageHeader
        title={task.title}
        eyebrow="Aufgabendetails"
        description={`Aufgabe im Event „${event.title}“.`}
        action={
          canEdit ? (
            <PrimaryLink href={getTaskHref(id, taskId, returnTo, true)}>
              Aufgabe bearbeiten
            </PrimaryLink>
          ) : undefined
        }
      />
      <Card>
        <div className="space-y-6 p-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge color={status.color}>{status.label}</StatusBadge>
            <StatusBadge color={priority.color}>{priority.label}</StatusBadge>
          </div>
          <div>
            <h2 className="text-brand-950 mb-2 font-bold">Beschreibung</h2>
            <p className="text-sm leading-6 break-words whitespace-pre-wrap text-slate-700">
              {task.description || "Keine Beschreibung hinterlegt."}
            </p>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {task.approvalRequired &&
          !task.approvedAt &&
          task.status !== TaskStatus.CANCELLED ? (
            hasPermission(currentUser, Permission.APPROVE_TASK) ? (
              <form action={approveTaskAction}>
                <input type="hidden" name="eventId" value={id} />
                <input type="hidden" name="taskId" value={taskId} />
                <PendingSubmitButton
                  className="bg-brand-900 hover:bg-brand-800 min-h-10 rounded-lg px-4 text-sm font-semibold text-white"
                  pendingLabel="Wird freigegeben …"
                >
                  Aufgabe freigeben
                </PendingSubmitButton>
              </form>
            ) : (
              <p className="text-sm text-slate-500">
                Die Freigabe erfolgt durch einen Admin oder Event Lead.
              </p>
            )
          ) : null}
        </div>
      </Card>
    </>
  );
}
