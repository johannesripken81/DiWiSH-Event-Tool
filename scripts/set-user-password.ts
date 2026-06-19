import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  hashPassword,
  isPasswordLongEnough,
  minimumPasswordLength,
} from "../src/lib/password";

const [emailInput, passwordInput] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();
const password = passwordInput?.trim();
const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_UNPOOLED oder DATABASE_URL fehlt. Bitte zuerst .env einrichten.",
  );
}

if (!email || !password) {
  throw new Error(
    'Bitte E-Mail und neues Passwort angeben, z. B. npm run user:set-password -- mail@diwish.de "Mein-sicheres-Passwort-2026"',
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
  const legacyEmail = "johannes.ripken@diwish.de";
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  const user =
    existingUser ??
    (email === "mail@diwish.de"
      ? await prisma.user.findUnique({
          where: { email: legacyEmail },
          select: { id: true, email: true, name: true },
        })
      : null);

  if (!user) {
    throw new Error(`Kein Nutzer mit dieser E-Mail gefunden: ${email}`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        passwordHash: hashPassword(password),
      },
    }),
    prisma.userSession.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  console.log(
    `Passwort gesetzt für ${user.name} (${user.email}). Bestehende Sitzungen wurden beendet.`,
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
