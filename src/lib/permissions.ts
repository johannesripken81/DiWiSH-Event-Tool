import { UserRole } from "@/generated/prisma/enums";

export const Permission = {
  READ_EVENT: "READ_EVENT",
  MANAGE_EVENTS: "MANAGE_EVENTS",
  MANAGE_ALL_TASKS: "MANAGE_ALL_TASKS",
  UPDATE_TASK: "UPDATE_TASK",
  CHANGE_TASK_STATUS: "CHANGE_TASK_STATUS",
  APPROVE_TASK: "APPROVE_TASK",
  MANAGE_COMMUNICATION: "MANAGE_COMMUNICATION",
  MANAGE_EVENT_OPERATIONS: "MANAGE_EVENT_OPERATIONS",
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

export type PermissionUser = {
  id: string;
  role: UserRole;
};

export type PermissionContext = {
  responsibleUserId?: string | null;
  guestAccessEnabled?: boolean;
};

export class PermissionDeniedError extends Error {
  constructor() {
    super("Du hast keine Berechtigung für diese Aktion.");
    this.name = "PermissionDeniedError";
  }
}

export function hasPermission(
  user: PermissionUser,
  permission: PermissionValue,
  context: PermissionContext = {},
) {
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  if (permission === Permission.READ_EVENT) {
    return user.role !== UserRole.GUEST || context.guestAccessEnabled === true;
  }

  if (user.role === UserRole.EVENT_LEAD) {
    return true;
  }

  if (user.role === UserRole.COMMUNICATION) {
    if (permission === Permission.MANAGE_COMMUNICATION) {
      return true;
    }

    return (
      (permission === Permission.UPDATE_TASK ||
        permission === Permission.CHANGE_TASK_STATUS) &&
      context.responsibleUserId === user.id
    );
  }

  if (user.role === UserRole.TEAM_MEMBER) {
    return (
      (permission === Permission.UPDATE_TASK ||
        permission === Permission.CHANGE_TASK_STATUS) &&
      context.responsibleUserId === user.id
    );
  }

  return false;
}

export function assertPermission(
  user: PermissionUser,
  permission: PermissionValue,
  context?: PermissionContext,
): asserts user is PermissionUser {
  if (!hasPermission(user, permission, context)) {
    throw new PermissionDeniedError();
  }
}
