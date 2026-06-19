import {
  EventPhase,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { calculateDueDate } from "@/modules/tasks/reverse-planning";

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
