import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  pgPool?: Pool;
  prisma?: PrismaClient;
};

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add the pooled Neon connection string to .env.",
    );
  }

  const trimmedConnectionString = connectionString.trim();

  if (!trimmedConnectionString.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL is invalid. In Vercel, set DATABASE_URL to the full pooled Neon connection string, for example postgresql://USER:PASSWORD@HOST-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require. Do not include DATABASE_URL= or quotes in the value.",
    );
  }

  try {
    const url = new URL(trimmedConnectionString);

    if (!url.hostname || url.hostname === "base") {
      throw new Error("Invalid database host.");
    }
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid Postgres URL. Copy the pooled Neon connection string again and paste only the URL value into Vercel.",
    );
  }

  return trimmedConnectionString;
}

function getPgPool() {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({
      allowExitOnIdle: true,
      connectionString: getConnectionString(),
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 120_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      max: 2,
    });
  }

  return globalForPrisma.pgPool;
}

function createPrismaClient() {
  const adapter = new PrismaPg(getPgPool());

  return new PrismaClient({ adapter });
}

export function getDb() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}
