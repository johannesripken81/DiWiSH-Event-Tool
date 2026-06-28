import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export type WebVitalSummary = {
  name: string;
  count: number;
  averageValue: number;
  p75Value: number;
  maxValue: number;
  poorCount: number;
};

export type WebVitalPathSummary = {
  name: string;
  path: string;
  count: number;
  p75Value: number;
  maxValue: number;
  poorCount: number;
};

type WebVitalSummaryRow = WebVitalSummary;
type WebVitalPathSummaryRow = WebVitalPathSummary;
type WebVitalCountRow = {
  count: number;
};

function getCutoff(days: number) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff;
}

export async function getWebVitalDashboard(days = 7) {
  const db = getDb();
  const cutoff = getCutoff(days);
  const [countRows, summaryRows, pathRows] = await Promise.all([
    db.$queryRaw<WebVitalCountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "WebVitalMetric"
      WHERE "createdAt" >= ${cutoff}
    `),
    db.$queryRaw<WebVitalSummaryRow[]>(Prisma.sql`
      SELECT
        name,
        COUNT(*)::int AS count,
        COALESCE(AVG(value), 0)::float AS "averageValue",
        COALESCE(
          percentile_cont(0.75) WITHIN GROUP (ORDER BY value),
          0
        )::float AS "p75Value",
        COALESCE(MAX(value), 0)::float AS "maxValue",
        COUNT(*) FILTER (WHERE rating = 'poor')::int AS "poorCount"
      FROM "WebVitalMetric"
      WHERE "createdAt" >= ${cutoff}
      GROUP BY name
      ORDER BY name ASC
    `),
    db.$queryRaw<WebVitalPathSummaryRow[]>(Prisma.sql`
      WITH grouped AS (
        SELECT
          name,
          path,
          COUNT(*)::int AS count,
          COALESCE(
            percentile_cont(0.75) WITHIN GROUP (ORDER BY value),
            0
          )::float AS "p75Value",
          COALESCE(MAX(value), 0)::float AS "maxValue",
          COUNT(*) FILTER (WHERE rating = 'poor')::int AS "poorCount"
        FROM "WebVitalMetric"
        WHERE "createdAt" >= ${cutoff}
        GROUP BY name, path
      )
      SELECT *
      FROM grouped
      ORDER BY
        CASE
          WHEN name = 'CLS' THEN "p75Value" * 1000
          ELSE "p75Value"
        END DESC,
        count DESC
      LIMIT 12
    `),
  ]);

  return {
    days,
    totalSamples: countRows[0]?.count ?? 0,
    summary: summaryRows,
    paths: pathRows,
  };
}
