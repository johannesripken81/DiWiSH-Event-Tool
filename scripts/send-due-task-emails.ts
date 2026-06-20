import "dotenv/config";

import { getDb } from "@/lib/db";
import { sendDueTodayTaskEmails } from "@/modules/notifications/due-task-emails";

async function main() {
  const db = getDb();

  try {
    const result = await sendDueTodayTaskEmails({ db });

    console.log(
      [
        `${result.checkedTasks} heute fällige Aufgaben geprüft.`,
        `${result.sentEmails} E-Mails versendet.`,
        `${result.skippedEmails} bereits versendete E-Mails übersprungen.`,
        `${result.failedEmails} Fehler.`,
        result.emailConfigured
          ? "E-Mail-Versand ist konfiguriert."
          : "E-Mail-Versand ist nicht vollständig konfiguriert.",
      ].join(" "),
    );

    if (!result.emailConfigured || result.failedEmails > 0) {
      process.exitCode = 1;
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fälligkeits-E-Mails konnten nicht versendet werden.", error);
  process.exitCode = 1;
});
