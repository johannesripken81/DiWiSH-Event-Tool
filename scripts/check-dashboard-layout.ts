import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import { getDashboardQuery } from "../src/modules/dashboard/queries";

loadEnvConfig(process.cwd());
async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
  });
  await client.connect();
  const schema = "dashboard_test_" + randomUUID().replaceAll("-", "");
  try {
    await client.query("BEGIN");
    await client.query('CREATE SCHEMA "' + schema + '"');
    await client.query('SET LOCAL search_path TO "' + schema + '"');
    await client.query(`
      CREATE TABLE "Event" (id TEXT, title TEXT, location TEXT, "eventDate" TIMESTAMP, status TEXT);
      CREATE TABLE "User" (id TEXT, name TEXT);
      CREATE TABLE "EventTask" (id TEXT, title TEXT, phase TEXT, "workPackage" TEXT, priority TEXT, "dueDate" TIMESTAMP, "isCritical" BOOLEAN, "eventId" TEXT, "responsibleUserId" TEXT, status TEXT);
      INSERT INTO "Event" VALUES ('e1','Event 1','Kiel','2026-10-20','PLANNING'), ('e2','Event 2',null,'2026-10-01','FOLLOW_UP'), ('e3','Event 3',null,'2026-10-25','COMPLETED'), ('e4','Event 4',null,'2026-10-25','CANCELLED');
      INSERT INTO "User" VALUES ('u1','Person 1'), ('u2','Person 2');
      INSERT INTO "EventTask" VALUES
        ('done','Erledigt','PLANNING',null,'HIGH','2026-10-09',false,'e1','u1','COMPLETED'),
        ('cancel','Entfällt','PLANNING',null,'HIGH','2026-10-09',false,'e1','u1','CANCELLED'),
        ('high','Z hohe Priorität','PLANNING','PROGRAM','HIGH','2026-10-09',true,'e1','u1','OPEN'),
        ('medium','A mittlere Priorität','PLANNING',null,'MEDIUM','2026-10-09',false,'e1','u2','IN_PROGRESS'),
        ('unassigned','Ohne Person','FOLLOW_UP',null,'LOW','2026-10-11',false,'e2',null,'OPEN'),
        ('later','Später','FOLLOW_UP',null,'LOW','2026-11-01',false,'e2','u1','OPEN');
    `);
    const base = {
      today: new Date("2026-10-10T00:00:00Z"),
      nextSevenDays: new Date("2026-10-17T00:00:00Z"),
      selectedUnassigned: false,
    };
    const execute = async (
      options: typeof base & { selectedResponsibleUserId?: string },
    ) => {
      const query = getDashboardQuery(options);
      return (await client.query(query.text, query.values)).rows[0];
    };
    const all = await execute(base);
    assert.equal(all.activeEvents, 2);
    assert.deepEqual(
      all.upcomingEvents.map((event: { id: string }) => event.id),
      ["e2", "e1"],
    );
    const event = all.upcomingEvents.find(
      (item: { id: string }) => item.id === "e1",
    );
    assert.equal(event.totalTasks, 4);
    assert.equal(event.completedTasks, 2);
    assert.equal(event.overdueTasks, 2);
    assert.deepEqual(
      all.dashboardTasks.map((task: { id: string }) => task.id),
      ["high", "medium", "unassigned"],
    );
    const mine = await execute({ ...base, selectedResponsibleUserId: "u1" });
    assert.deepEqual(
      mine.dashboardTasks.map((task: { id: string }) => task.id),
      ["high"],
    );
    const unassigned = await execute({ ...base, selectedUnassigned: true });
    assert.deepEqual(
      unassigned.dashboardTasks.map((task: { id: string }) => task.id),
      ["unassigned"],
    );
    console.log(
      "Dashboard-Abfrage geprüft: aktive Events, Abschlussstatus, Überfälligkeit, Priorität und Personenfilter. Testdaten werden zurückgerollt.",
    );
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}
main().catch(() => {
  console.error(
    "Dashboard-Test fehlgeschlagen. Bestehende Eventdaten wurden nicht verändert.",
  );
  process.exitCode = 1;
});
