import "dotenv/config";

import { getDb } from "@/lib/db";
import { generateDueNotifications } from "@/modules/notifications/due-notifications";

async function main() {
  const db = getDb();

  try {
    const result = await generateDueNotifications({ db });

    console.log(
      [
        `${result.checkedTasks} offene Aufgaben geprüft.`,
        `${result.createdNotifications} Benachrichtigungen erzeugt.`,
        `${result.reminderNotifications} Erinnerungen.`,
        `${result.escalationNotifications} Eskalationen.`,
      ].join(" "),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Benachrichtigungen konnten nicht erzeugt werden.", error);
  process.exitCode = 1;
});
