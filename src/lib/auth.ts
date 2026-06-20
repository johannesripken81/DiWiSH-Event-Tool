import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import type { User } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const sessionCookieName = "diwish_event_session";
const sessionDurationDays = 30;
const dummyPasswordHash =
  "scrypt$16384$8$1$diwish-login-dummy-salt$-WgW_yzn75VvBWn0sz0tzxPQ7ZtnQqPHnS39E3JHLpx57z-0DdOEgbkxqsf7zhl3nvpbqb2l1JBAQiBVG-VDhA";

function getSessionExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionDurationDays);

  return expiresAt;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeLoginIdentifier(identifier: string) {
  return identifier.trim();
}

export async function authenticateUser(identifier: string, password: string) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (!normalizedIdentifier || !password) {
    return null;
  }

  const db = getDb();
  const userByEmail = await db.user.findUnique({
    where: { email: normalizedIdentifier.toLowerCase() },
  });
  const user =
    userByEmail ??
    (await db.user.findFirst({
      where: { name: normalizedIdentifier },
    }));
  const passwordMatches = verifyPassword(
    password,
    user?.passwordHash ?? dummyPasswordHash,
  );

  if (!user || !passwordMatches) {
    return null;
  }

  return user;
}

export async function createLoginSession(userId: string) {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = getSessionExpiresAt();

  await db.userSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function deleteCurrentLoginSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await getDb().userSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  cookieStore.delete(sessionCookieName);
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await getDb().userSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function deleteExpiredSessions() {
  await getDb().userSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
