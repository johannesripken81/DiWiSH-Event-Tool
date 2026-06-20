"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { TaskPriority, UserRole } from "@/generated/prisma/enums";
import { clearCurrentUserCache, getCurrentUser } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { hashPassword, isPasswordLongEnough } from "@/lib/password";
import { ensureDefaultEventTemplates } from "@/modules/events/default-templates";
import { generateDueNotifications } from "@/modules/notifications/due-notifications";
import { getNotificationSettings } from "@/modules/settings/queries";
import {
  notificationSettingsKey,
  parseEventTemplateSettings,
  parseNotificationSettings,
  parseTaskTemplateSettings,
  parseUserSettings,
  parseWorkspaceSettings,
  workspaceSettingsKey,
} from "@/modules/settings/settings";

async function requireAdmin() {
  const currentUser = await getCurrentUser();

  if (currentUser.role !== UserRole.ADMIN) {
    redirect("/settings?error=admin");
  }

  return currentUser;
}

function getSettingsReturnTo(formData: FormData) {
  const returnTo = formData.get("returnTo");

  if (typeof returnTo === "string" && returnTo.startsWith("/settings")) {
    return returnTo;
  }

  return "/settings";
}

function settingsRedirect(
  params: Record<string, string>,
  returnTo = "/settings",
): never {
  const query = new URLSearchParams(params);
  redirect(`${returnTo}?${query.toString()}`);
}

function validationRedirect(
  section: string,
  error: unknown,
  returnTo = "/settings",
): never {
  if (error instanceof z.ZodError) {
    settingsRedirect({ error: "invalid", section }, returnTo);
  }

  throw error;
}

export async function saveWorkspaceSettingsAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);

  let settings;
  try {
    settings = parseWorkspaceSettings(formData);
  } catch (error) {
    validationRedirect("workspace", error, returnTo);
  }

  const db = getDb();
  await db.appSetting.upsert({
    where: { key: workspaceSettingsKey },
    create: { key: workspaceSettingsKey, value: settings },
    update: { value: settings },
  });

  revalidatePath("/settings");
  settingsRedirect({ saved: "workspace" }, returnTo);
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);

  let input;
  try {
    input = parseUserSettings(formData);
  } catch (error) {
    validationRedirect("team", error, returnTo);
  }

  if (!isPasswordLongEnough(input.password)) {
    settingsRedirect({ error: "password", section: "team" }, returnTo);
  }

  const db = getDb();
  try {
    await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: hashPassword(input.password),
        role: input.role,
      },
    });
  } catch {
    settingsRedirect({ error: "user-email", section: "team" }, returnTo);
  }

  clearCurrentUserCache();
  revalidatePath("/settings");
  settingsRedirect({ saved: "team" }, returnTo);
}

export async function updateUserAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);

  let input;
  try {
    input = parseUserSettings(formData);
  } catch (error) {
    validationRedirect("team", error, returnTo);
  }

  if (!input.userId) {
    settingsRedirect({ error: "invalid", section: "team" }, returnTo);
  }

  const db = getDb();
  const existingUser = await db.user.findUnique({
    where: { id: input.userId },
  });

  if (!existingUser) {
    settingsRedirect({ error: "not-found", section: "team" }, returnTo);
  }

  const adminCount = await db.user.count({ where: { role: UserRole.ADMIN } });
  if (
    existingUser.role === UserRole.ADMIN &&
    input.role !== UserRole.ADMIN &&
    adminCount <= 1
  ) {
    settingsRedirect({ error: "last-admin", section: "team" }, returnTo);
  }

  const data: {
    email: string;
    name: string;
    passwordHash?: string;
    role: UserRole;
  } = {
    name: input.name,
    email: input.email,
    role: input.role,
  };

  if (input.password) {
    if (!isPasswordLongEnough(input.password)) {
      settingsRedirect({ error: "password", section: "team" }, returnTo);
    }

    data.passwordHash = hashPassword(input.password);
  }

  try {
    await db.$transaction([
      db.user.update({
        where: { id: input.userId },
        data,
      }),
      ...(input.password
        ? [
            db.userSession.deleteMany({
              where: { userId: input.userId },
            }),
          ]
        : []),
    ]);
  } catch {
    settingsRedirect({ error: "user-email", section: "team" }, returnTo);
  }

  clearCurrentUserCache();
  revalidatePath("/settings");
  settingsRedirect({ saved: "team" }, returnTo);
}

export async function deleteUserAction(formData: FormData) {
  const currentUser = await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);
  const userId = formData.get("userId");

  if (typeof userId !== "string" || !userId) {
    settingsRedirect({ error: "invalid", section: "team" }, returnTo);
  }

  if (userId === currentUser.id) {
    settingsRedirect({ error: "current-user", section: "team" }, returnTo);
  }

  const db = getDb();
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    settingsRedirect({ error: "not-found", section: "team" }, returnTo);
  }

  const adminCount = await db.user.count({ where: { role: UserRole.ADMIN } });
  if (user.role === UserRole.ADMIN && adminCount <= 1) {
    settingsRedirect({ error: "last-admin", section: "team" }, returnTo);
  }

  await db.user.delete({ where: { id: userId } });

  clearCurrentUserCache();
  revalidatePath("/settings");
  settingsRedirect({ saved: "team" }, returnTo);
}

export async function createEventTemplateAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);

  let input;
  try {
    input = parseEventTemplateSettings(formData);
  } catch (error) {
    validationRedirect("templates", error, returnTo);
  }

  try {
    await getDb().eventTemplate.create({
      data: {
        name: input.name,
        description: input.description || null,
      },
    });
  } catch {
    settingsRedirect(
      { error: "template-name", section: "templates" },
      returnTo,
    );
  }

  revalidatePath("/settings");
  settingsRedirect({ saved: "templates" }, returnTo);
}

export async function ensureDefaultEventTemplatesAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);
  const result = await ensureDefaultEventTemplates();

  revalidatePath("/settings");
  settingsRedirect(
    {
      saved: "default-templates",
      templates: String(result.templateCount),
      tasks: String(result.taskCount),
    },
    returnTo,
  );
}

export async function updateEventTemplateAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);

  let input;
  try {
    input = parseEventTemplateSettings(formData);
  } catch (error) {
    validationRedirect("templates", error, returnTo);
  }

  if (!input.templateId) {
    settingsRedirect({ error: "invalid", section: "templates" }, returnTo);
  }

  try {
    await getDb().eventTemplate.update({
      where: { id: input.templateId },
      data: {
        name: input.name,
        description: input.description || null,
      },
    });
  } catch {
    settingsRedirect(
      { error: "template-name", section: "templates" },
      returnTo,
    );
  }

  revalidatePath("/settings");
  revalidatePath(returnTo);
  settingsRedirect({ saved: "templates" }, returnTo);
}

export async function deleteEventTemplateAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);
  const templateId = formData.get("templateId");

  if (typeof templateId !== "string" || !templateId) {
    settingsRedirect({ error: "invalid", section: "templates" }, returnTo);
  }

  await getDb().eventTemplate.delete({ where: { id: templateId } });

  revalidatePath("/settings");
  settingsRedirect({ saved: "templates" }, returnTo);
}

export async function createTaskTemplateAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);

  let input;
  try {
    input = parseTaskTemplateSettings(formData);
  } catch (error) {
    validationRedirect("templates", error, returnTo);
  }

  await getDb().taskTemplate.create({
    data: {
      eventTemplateId: input.eventTemplateId,
      title: input.title,
      description: input.description || null,
      phase: input.phase,
      defaultResponsibleRole: input.defaultResponsibleRole,
      defaultReviewerRole: input.defaultReviewerRole || null,
      priority: input.priority,
      offsetDays: input.offsetDays,
      approvalRequired: input.approvalRequired,
      isCritical: input.isCritical || input.priority === TaskPriority.CRITICAL,
    },
  });

  revalidatePath("/settings");
  revalidatePath(returnTo);
  settingsRedirect({ saved: "templates" }, returnTo);
}

export async function updateTaskTemplateAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);

  let input;
  try {
    input = parseTaskTemplateSettings(formData);
  } catch (error) {
    validationRedirect("templates", error, returnTo);
  }

  if (!input.taskTemplateId) {
    settingsRedirect({ error: "invalid", section: "templates" }, returnTo);
  }

  await getDb().taskTemplate.update({
    where: { id: input.taskTemplateId },
    data: {
      title: input.title,
      description: input.description || null,
      phase: input.phase,
      defaultResponsibleRole: input.defaultResponsibleRole,
      defaultReviewerRole: input.defaultReviewerRole || null,
      priority: input.priority,
      offsetDays: input.offsetDays,
      approvalRequired: input.approvalRequired,
      isCritical: input.isCritical || input.priority === TaskPriority.CRITICAL,
    },
  });

  revalidatePath("/settings");
  revalidatePath(returnTo);
  settingsRedirect({ saved: "templates" }, returnTo);
}

export async function deleteTaskTemplateAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);
  const taskTemplateId = formData.get("taskTemplateId");

  if (typeof taskTemplateId !== "string" || !taskTemplateId) {
    settingsRedirect({ error: "invalid", section: "templates" }, returnTo);
  }

  await getDb().taskTemplate.delete({ where: { id: taskTemplateId } });

  revalidatePath("/settings");
  revalidatePath(returnTo);
  settingsRedirect({ saved: "templates" }, returnTo);
}

export async function saveNotificationSettingsAction(formData: FormData) {
  await requireAdmin();
  const returnTo = getSettingsReturnTo(formData);

  let settings;
  try {
    settings = parseNotificationSettings(formData);
  } catch (error) {
    validationRedirect("notifications", error, returnTo);
  }

  const db = getDb();
  await db.appSetting.upsert({
    where: { key: notificationSettingsKey },
    create: { key: notificationSettingsKey, value: settings },
    update: { value: settings },
  });

  revalidatePath("/settings");
  settingsRedirect({ saved: "notifications" }, returnTo);
}

export async function generateNotificationsAction() {
  await requireAdmin();
  const db = getDb();
  const settings = await getNotificationSettings(db);
  let result;

  try {
    result = await generateDueNotifications({
      db,
      rules: settings,
    });
  } catch {
    settingsRedirect({ error: "notifications-run" });
  }

  revalidatePath("/settings");
  settingsRedirect({
    saved: "notifications-run",
    created: String(result.createdNotifications),
    checked: String(result.checkedTasks),
  });
}
