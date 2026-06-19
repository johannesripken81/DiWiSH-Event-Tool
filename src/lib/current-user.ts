import { cache } from "react";

import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { assertPermission, Permission } from "@/lib/permissions";

export function clearCurrentUserCache() {
  // Kept for settings actions that invalidate user-related state.
}

export const getOptionalCurrentUser = cache(async () => getSessionUser());

export const getCurrentUser = cache(async () => {
  const user = await getOptionalCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export async function requireEventReadAccess() {
  const currentUser = await getCurrentUser();
  assertPermission(currentUser, Permission.READ_EVENT);

  return currentUser;
}
