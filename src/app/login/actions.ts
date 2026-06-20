"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  authenticateUser,
  createLoginSession,
  deleteCurrentLoginSession,
} from "@/lib/auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  createLoginRateLimitKey,
  recordFailedLogin,
} from "@/lib/login-rate-limit";

function getString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getSafeReturnTo(formData: FormData) {
  const returnTo = getString(formData, "returnTo");

  if (
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.startsWith("/login")
  ) {
    return returnTo;
  }

  return "/";
}

async function getClientIpAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "local"
  );
}

function getLoginRedirect(error: string, returnTo: string) {
  const query = new URLSearchParams({ error });

  if (returnTo !== "/") {
    query.set("returnTo", returnTo);
  }

  return `/login?${query.toString()}`;
}

export async function loginAction(formData: FormData) {
  const identifier = getString(formData, "identifier");
  const password = getString(formData, "password");
  const returnTo = getSafeReturnTo(formData);
  const rateLimitKey = createLoginRateLimitKey(
    identifier,
    await getClientIpAddress(),
  );
  const rateLimit = checkLoginRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    redirect(getLoginRedirect("rate-limit", returnTo));
  }

  const user = await authenticateUser(identifier, password);

  if (!user) {
    recordFailedLogin(rateLimitKey);
    redirect(getLoginRedirect("invalid", returnTo));
  }

  clearLoginRateLimit(rateLimitKey);
  await createLoginSession(user.id);
  revalidatePath("/", "layout");
  redirect(returnTo);
}

export async function logoutAction() {
  await deleteCurrentLoginSession();
  revalidatePath("/", "layout");
  redirect("/login?loggedOut=1");
}
