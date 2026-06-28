"use client";

import { useReportWebVitals } from "next/web-vitals";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const explicitSetting = process.env.NEXT_PUBLIC_WEB_VITALS_ENABLED;
const isEnabled =
  explicitSetting === "true" ||
  (explicitSetting !== "false" && process.env.NODE_ENV === "production");

const reportWebVitals: ReportWebVitalsCallback = (metric) => {
  if (!isEnabled) {
    return;
  }

  const payload = JSON.stringify({
    delta: metric.delta,
    id: metric.id,
    name: metric.name,
    navigationType: metric.navigationType,
    path: window.location.pathname,
    rating: "rating" in metric ? metric.rating : undefined,
    value: metric.value,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/web-vitals", payload);
    return;
  }

  void fetch("/api/web-vitals", {
    body: payload,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  });
};

export function WebVitalsReporter() {
  useReportWebVitals(reportWebVitals);

  return null;
}
