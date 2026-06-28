import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { sendDueTodayTaskEmails } from "@/modules/notifications/due-task-emails";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueTodayTaskEmails();

  return NextResponse.json(result, {
    status: result.emailConfigured ? 200 : 503,
  });
}
