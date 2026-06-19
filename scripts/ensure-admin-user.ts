import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import {
  hashPassword,
  isPasswordLongEnough,
  minimumPasswordLength,
} from "../src/lib/password";

const [emailInput, passwordInput, nameInput] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();
const password = passwordInput?.trim();
const name = nameInput?.trim() || "DIWISH Admin";
const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_UNPOOLED oder DATABASE_URL fehlt. Bitte zuerst .env einrichten.",
  );
}

if (!email || !password) {
  throw new Error(
    'Bitte E-Mail und Passwort angeben, z. B. npm run user:ensure-admin -- mail@diwish.de "Mein-sicheres-Passwort-2026" "Johannes Ripken"',
  );
}

if (!isPasswordLongEnough(password)) {
  throw new Error(
    `Das Passwort muss mindestens ${minimumPasswordLength} Zeichen haben.`,
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash: hashPassword(password),
      role: UserRole.ADMIN,
    },
    create: {
      email,
      name,
      passwordHash: hashPassword(password),
      role: UserRole.ADMIN,
    },
  });

  await prisma.userSession.deleteMany({
    where: { userId: user.id },
  });

  console.log(
    `Admin-Zugang ist bereit: ${user.name} (${user.email}). Bestehende Sitzungen wurden beendet.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
