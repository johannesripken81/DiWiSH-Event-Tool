import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const webVitalSchema = z.object({
  delta: z.number(),
  id: z.string().max(200),
  name: z.string().max(40),
  navigationType: z.string().max(50).optional(),
  path: z.string().max(300),
  rating: z.string().max(20).optional(),
  value: z.number(),
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = webVitalSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
  }

  const metric = result.data;
  const db = getDb();

  await db.webVitalMetric.create({
    data: {
      delta: metric.delta,
      metricId: metric.id,
      name: metric.name,
      navigationType: metric.navigationType,
      path: metric.path,
      rating: metric.rating,
      value: metric.value,
    },
  });

  return new Response(null, { status: 204 });
}
