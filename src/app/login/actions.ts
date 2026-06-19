"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authenticateUser,
  createLoginSession,
  deleteCurrentLoginSession,
} from "@/lib/auth";

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

export async function loginAction(formData: FormData) {
  const identifier = getString(formData, "identifier");
  const password = getString(formData, "password");
  const returnTo = getSafeReturnTo(formData);
  const user = await authenticateUser(identifier, password);

  if (!user) {
    redirect("/login?error=invalid");
  }

  await createLoginSession(user.id);
  revalidatePath("/", "layout");
  redirect(returnTo);
}

export async function logoutAction() {
  await deleteCurrentLoginSession();
  revalidatePath("/", "layout");
  redirect("/login?loggedOut=1");
}
