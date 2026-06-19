import "dotenv/config";

import { defineConfig } from "prisma/config";

// Prisma CLI operations need Neon's direct connection. Keeping an empty
// fallback allows generate/validate to run before local credentials exist.
const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
