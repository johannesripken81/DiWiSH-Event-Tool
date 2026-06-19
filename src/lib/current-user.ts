import { cache } from "react";

import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { assertPermission, Permission } from "@/lib/permissions";

export function clearCurrentUserCache() {
  // Kept for settings actions that invalidate user-related state.
}

function isNextDynamicServerError(error: unknown) {
  return (
    error instanceof Error &&
    "digest" in error &&
    (error as Error & { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

export const getOptionalCurrentUser = cache(async () => {
  try {
    return await getSessionUser();
  } catch (error) {
    if (isNextDynamicServerError(error)) {
      throw error;
    }

    console.error("Could not load optional current user.", error);
    return null;
  }
});

export const getCurrentUser = cache(async () => {
  const user = await getSessionUser();

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
