import { unstable_cache } from "next/cache";

import { getDb } from "@/lib/db";

export const referenceDataCacheTags = {
  eventTemplates: "reference-event-templates",
  users: "reference-users",
} as const;

export const getCachedUserOptions = unstable_cache(
  async () =>
    getDb().user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    }),
  ["reference-user-options"],
  {
    revalidate: 300,
    tags: [referenceDataCacheTags.users],
  },
);

export const getCachedSettingsUsers = unstable_cache(
  async () =>
    getDb().user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ["reference-settings-users"],
  {
    revalidate: 300,
    tags: [referenceDataCacheTags.users],
  },
);

export const getCachedEventTemplateOptions = unstable_cache(
  async () =>
    getDb().eventTemplate.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            taskTemplates: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ["reference-event-template-options"],
  {
    revalidate: 300,
    tags: [referenceDataCacheTags.eventTemplates],
  },
);
