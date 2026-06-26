import {
  EventPhase,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { calculateDueDate } from "@/modules/tasks/reverse-planning";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type TemplateTaskSource = {
  title: string;
  description: string | null;
  phase: EventPhase;
  defaultResponsibleRole: UserRole;
  defaultReviewerRole: UserRole | null;
  priority: TaskPriority;
  offsetDays: number;
  approvalRequired: boolean;
  isCritical: boolean;
};

export type EventTaskTemplateSource = {
  title: string;
  description: string | null;
  phase: EventPhase;
  responsibleUser: { role: UserRole } | null;
  reviewerUser: { role: UserRole } | null;
  priority: TaskPriority;
  dueDate: Date | null;
  offsetDays: number | null;
  approvalRequired: boolean;
  isCritical: boolean;
};

export type TemplateAssignmentUser = {
  id: string;
  role: UserRole;
};

type TemplateTaskContext = {
  eventId: string;
  eventDate: Date;
  eventLeadId: string;
  coLeadId: string | null;
  communicationOwnerId: string | null;
  users: TemplateAssignmentUser[];
};

function resolveUserForRole({
  role,
  users,
  eventLeadId,
  coLeadId,
  communicationOwnerId,
  excludeUserId,
  reviewer = false,
}: {
  role: UserRole | null;
  users: TemplateAssignmentUser[];
  eventLeadId: string;
  coLeadId: string | null;
  communicationOwnerId: string | null;
  excludeUserId?: string | null;
  reviewer?: boolean;
}) {
  if (!role) {
    return null;
  }

  const preferredId =
    role === UserRole.EVENT_LEAD
      ? reviewer
        ? coLeadId || eventLeadId
        : eventLeadId
      : role === UserRole.COMMUNICATION
        ? communicationOwnerId
        : null;

  if (preferredId && preferredId !== excludeUserId) {
    return preferredId;
  }

  return (
    users.find((user) => user.role === role && user.id !== excludeUserId)?.id ??
    null
  );
}

function getUtcDateOnlyTime(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getTemplateOffsetDays(task: EventTaskTemplateSource, eventDate: Date) {
  if (task.dueDate) {
    return Math.round(
      (getUtcDateOnlyTime(task.dueDate) - getUtcDateOnlyTime(eventDate)) /
        MILLISECONDS_PER_DAY,
    );
  }

  return task.offsetDays ?? 0;
}

export function createTaskTemplatesFromEventTasks(
  tasks: EventTaskTemplateSource[],
  eventDate: Date,
): TemplateTaskSource[] {
  return tasks.map((task) => ({
    title: task.title,
    description: task.description,
    phase: task.phase,
    defaultResponsibleRole: task.responsibleUser?.role ?? UserRole.EVENT_LEAD,
    defaultReviewerRole: task.reviewerUser?.role ?? null,
    priority: task.priority,
    offsetDays: getTemplateOffsetDays(task, eventDate),
    approvalRequired: task.approvalRequired,
    isCritical: task.isCritical || task.priority === TaskPriority.CRITICAL,
  }));
}

export function createEventTasksFromTemplate(
  templates: TemplateTaskSource[],
  context: TemplateTaskContext,
) {
  return templates.map((template) => {
    const responsibleUserId = resolveUserForRole({
      role: template.defaultResponsibleRole,
      users: context.users,
      eventLeadId: context.eventLeadId,
      coLeadId: context.coLeadId,
      communicationOwnerId: context.communicationOwnerId,
    });
    const reviewerUserId = resolveUserForRole({
      role: template.defaultReviewerRole,
      users: context.users,
      eventLeadId: context.eventLeadId,
      coLeadId: context.coLeadId,
      communicationOwnerId: context.communicationOwnerId,
      excludeUserId: responsibleUserId,
      reviewer: true,
    });

    return {
      eventId: context.eventId,
      title: template.title,
      description: template.description,
      phase: template.phase,
      responsibleUserId,
      reviewerUserId,
      status: TaskStatus.OPEN,
      priority: template.priority,
      dueDate: calculateDueDate(context.eventDate, template.offsetDays),
      offsetDays: template.offsetDays,
      approvalRequired: template.approvalRequired,
      isCritical: template.isCritical,
    };
  });
}
