CREATE TABLE "WebVitalMetric" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "rating" TEXT,
    "navigationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebVitalMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebVitalMetric_createdAt_idx" ON "WebVitalMetric"("createdAt");
CREATE INDEX "WebVitalMetric_name_path_createdAt_idx" ON "WebVitalMetric"("name", "path", "createdAt");
