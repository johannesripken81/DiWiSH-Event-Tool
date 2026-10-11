import { loadEnvConfig } from "@next/env";
import { getDb } from "@/lib/db";
import { TaskStatus } from "@/generated/prisma/enums";

loadEnvConfig(process.cwd());

async function main() {
  console.log(
    JSON.stringify({
      localConfiguration: {
        database: Boolean(process.env.DATABASE_URL?.trim()),
        emailApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
        emailSender: Boolean(process.env.EMAIL_FROM?.trim()),
        emailBaseUrl: Boolean(
          process.env.APP_BASE_URL?.trim() || process.env.VERCEL_URL?.trim(),
        ),
        cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
      },
    }),
  );
  const db = getDb();
  try {
    const [conflicts, users, undatedOpenTasks, notifications] =
      await Promise.all([
        db.$queryRaw<Array<{ id: string; title: string; eventTitle: string }>>`
        SELECT t.id, t.title, e.title AS "eventTitle"
        FROM "EventTask" t JOIN "Event" e ON e.id = t."eventId"
        WHERE t."responsibleUserId" IS NOT NULL
          AND t."responsibleUserId" = t."reviewerUserId"
        ORDER BY e.title, t.title`,
        db.user.groupBy({ by: ["role"], _count: { _all: true } }),
        db.eventTask.count({
          where: {
            dueDate: null,
            status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
          },
        }),
        db.notification.count(),
      ]);
    console.log(
      JSON.stringify(
        {
          assignmentConflicts: conflicts,
          usersByRole: users,
          undatedOpenTasks,
          storedNotifications: notifications,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  console.error(
    "Datenprüfung fehlgeschlagen. Verbindung und Zugriffsrechte prüfen. Es wurden keine Daten geändert.",
  );
  process.exitCode = 1;
});
