import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedMigration = "20261117120000_feedback_quick_fixes";

async function verifySchema(client) {
  const { rows } = await client.query(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Event' AND column_name='project') AS project,
      EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='TaskStatus' AND e.enumlabel='WAITING_EXTERNAL') AS waiting
  `);
  if (!rows[0].project || !rows[0].waiting) {
    throw new Error(
      "Projektfeld oder externer Aufgabenstatus fehlt nach der Migration.",
    );
  }
}

async function main() {
  const environment = process.argv[2];
  if (!["preview", "production"].includes(environment)) {
    throw new Error(
      "Den Migrationslauf ueber publish-feedback-local.ps1 starten.",
    );
  }
  const project = JSON.parse(
    fs.readFileSync(path.join(root, ".vercel/project.json"), "utf8"),
  );
  if (
    project.projectId !== "prj_ab2dtFw2kznrT6L8PzftkIPwQGv4" ||
    project.orgId !== "team_dLVHdYNNoYnraHawEbTsqNdX"
  ) {
    throw new Error("Unerwartetes Vercel-Projekt.");
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== environment) {
    throw new Error(
      "Die geladenen Vercel-Variablen passen nicht zur gewaehlten Umgebung.",
    );
  }
  // Deliberately do not load .env: Vercel env run supplies this environment's values.
  const connectionString = process.env.DATABASE_URL_UNPOOLED?.trim();
  if (!connectionString)
    throw new Error(
      "DATABASE_URL_UNPOOLED fehlt in der gewaehlten Vercel-Umgebung.",
    );
  const url = new URL(connectionString);
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !url.hostname ||
    url.hostname === "base"
  ) {
    throw new Error("Ungueltige Datenbankadresse in Vercel.");
  }
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15000,
    statement_timeout: 15000,
  });
  await client.connect();
  try {
    const migrations = fs
      .readdirSync(path.join(root, "prisma/migrations"))
      .filter((name) =>
        fs.existsSync(
          path.join(root, "prisma/migrations", name, "migration.sql"),
        ),
      )
      .sort();
    const { rows } = await client.query(
      'SELECT migration_name,finished_at,rolled_back_at FROM public."_prisma_migrations"',
    );
    if (rows.some((row) => !row.finished_at && !row.rolled_back_at)) {
      throw new Error(
        "Eine fruehere Migration ist fehlgeschlagen. Zuerst ihren Status klaeren.",
      );
    }
    const applied = new Set(
      rows
        .filter((row) => row.finished_at && !row.rolled_back_at)
        .map((row) => row.migration_name),
    );
    const pending = migrations.filter((name) => !applied.has(name));
    if (pending.some((name) => name !== expectedMigration)) {
      throw new Error(
        `Weitere ausstehende Migrationen zuerst pruefen: ${pending.join(", ")}`,
      );
    }
    console.log(
      `Umgebung: ${environment}; Datenbankziel: ${url.hostname}${url.pathname}`,
    );
    if (pending.length === 0) {
      await verifySchema(client);
      console.log(
        "Die Feedback-Migration ist bereits angewendet; Schema geprueft.",
      );
      return;
    }
    console.log(`Migration: ${expectedMigration}`);
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
      ],
      {
        cwd: root,
        env: { ...process.env, DATABASE_URL_UNPOOLED: connectionString },
        stdio: "inherit",
      },
    );
    if (result.error || result.status !== 0)
      throw new Error(
        "Prisma-Migration fehlgeschlagen. Noch nicht nach main mergen.",
      );
    await verifySchema(client);
    console.log("Feedback-Migration erfolgreich angewendet und geprueft.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Migrationslauf fehlgeschlagen.",
  );
  process.exitCode = 1;
});
