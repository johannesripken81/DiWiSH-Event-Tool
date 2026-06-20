import "dotenv/config";

import { getDb } from "@/lib/db";
import { ensureDefaultEventTemplates } from "@/modules/events/default-templates";

async function main() {
  const db = getDb();

  try {
    const result = await ensureDefaultEventTemplates(db);

    console.log(
      `${result.templateCount} Standardvorlagen mit ${result.taskCount} Aufgaben aktualisiert.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("Standardvorlagen konnten nicht aktualisiert werden.", error);
  process.exitCode = 1;
});
