import { NextResponse } from "next/server";

import { sendDueTodayTaskEmails } from "@/modules/notifications/due-task-emails";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueTodayTaskEmails();

  return NextResponse.json(result, {
    status: result.emailConfigured ? 200 : 503,
  });
}
