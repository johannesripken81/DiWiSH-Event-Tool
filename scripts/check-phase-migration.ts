import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

loadEnvConfig(process.cwd());

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
  });
  await client.connect();
  const schema = `feedback_test_${randomUUID().replaceAll("-", "")}`;
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    await client.query(
      `CREATE TYPE "EventPhase" AS ENUM ('CONCEPTION','FOUR_EYES_REVIEW','LOCATION_CATERING','SPEAKERS_PARTNERS','COMMUNICATION','PARTICIPANT_MANAGEMENT','MATERIAL_PRESENTATION','TECHNOLOGY','EVENT_DAY','FOLLOW_UP','EVALUATION'); CREATE TYPE "TaskPriority" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL')`,
    );
    for (const table of ["EventTask", "TaskTemplate"]) {
      await client.query(
        `CREATE TABLE "${table}" (id SERIAL PRIMARY KEY, title TEXT, phase "EventPhase", priority "TaskPriority" DEFAULT 'MEDIUM', "isCritical" BOOLEAN DEFAULT false)`,
      );
      await client.query(
        `INSERT INTO "${table}" (title,phase,priority) SELECT value::text, value, 'CRITICAL' FROM unnest(enum_range(NULL::"EventPhase")) AS value`,
      );
    }
    const migration = readFileSync(
      "prisma/migrations/20261010120000_phases_work_packages_priorities/migration.sql",
      "utf8",
    )
      .replace(/^BEGIN;\s*/m, "")
      .replace(/^COMMIT;\s*/m, "");
    await client.query(migration);
    for (const table of ["EventTask", "TaskTemplate"]) {
      const { rows } = await client.query(
        `SELECT title,phase::text,priority::text,"workPackage","isCritical" FROM "${table}"`,
      );
      assert.equal(rows.length, 11);
      assert.ok(rows.every((row) => row.priority === "HIGH" && row.isCritical));
      const byTitle = new Map(rows.map((row) => [row.title, row]));
      assert.equal(byTitle.get("FOUR_EYES_REVIEW").phase, "CONCEPTION");
      assert.equal(byTitle.get("EVENT_DAY").phase, "EXECUTION");
      assert.equal(byTitle.get("EVALUATION").phase, "FOLLOW_UP");
      assert.equal(
        byTitle.get("SPEAKERS_PARTNERS").workPackage,
        "LEGACY_SPEAKERS_PARTNERS",
      );
      assert.equal(byTitle.get("COMMUNICATION").workPackage, "COMMUNICATION");
      assert.equal(
        byTitle.get("TECHNOLOGY").workPackage,
        "TECHNOLOGY_MATERIAL",
      );
      assert.equal(byTitle.get("LOCATION_CATERING").phase, "PLANNING");
    }
    console.log(
      "Datenmigration für alle bisherigen Phasen und kritischen Prioritäten erfolgreich geprüft. Teständerungen werden zurückgerollt.",
    );
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}

main().catch(() => {
  console.error(
    "Migrationstest fehlgeschlagen. Die bestehenden Eventdaten wurden nicht verändert.",
  );
  process.exitCode = 1;
});
