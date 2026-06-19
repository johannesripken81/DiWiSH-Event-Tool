import { getDb } from "@/lib/db";

import {
  defaultNotificationSettings,
  defaultWorkspaceSettings,
  notificationSettingsKey,
  notificationSettingsSchema,
  parseStoredSettings,
  workspaceSettingsKey,
  workspaceSettingsSchema,
} from "./settings";

type DbClient = ReturnType<typeof getDb>;

export async function getWorkspaceSettings(db: DbClient = getDb()) {
  const setting = await db.appSetting.findUnique({
    where: { key: workspaceSettingsKey },
  });

  return parseStoredSettings(
    setting?.value,
    workspaceSettingsSchema,
    defaultWorkspaceSettings,
  );
}

export async function getNotificationSettings(db: DbClient = getDb()) {
  const setting = await db.appSetting.findUnique({
    where: { key: notificationSettingsKey },
  });

  return parseStoredSettings(
    setting?.value,
    notificationSettingsSchema,
    defaultNotificationSettings,
  );
}
