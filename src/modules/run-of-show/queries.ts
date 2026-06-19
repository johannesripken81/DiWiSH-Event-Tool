import { requireEventReadAccess } from "@/lib/current-user";
import { getDb } from "@/lib/db";
import { sortRunOfShowItems } from "@/modules/run-of-show/schedule";

export async function getRunOfShow(eventId: string) {
  await requireEventReadAccess();
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      location: true,
      runOfShowItems: {
        include: {
          responsibleUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ startTime: "asc" }, { endTime: "asc" }],
      },
    },
  });

  if (!event) {
    return null;
  }

  return {
    ...event,
    runOfShowItems: sortRunOfShowItems(event.runOfShowItems),
  };
}

export async function getRunOfShowEditorData(eventId: string, itemId?: string) {
  await requireEventReadAccess();
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
    },
  });
  const item = itemId
    ? await db.runOfShowItem.findFirst({
        where: {
          id: itemId,
          eventId,
        },
      })
    : null;
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return { event, item, users };
}
