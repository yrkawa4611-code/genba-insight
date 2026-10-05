-- Keep the oldest entry linked; preserve other entries as unregistered schedules.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "id") AS position
  FROM "CalendarEntry"
  WHERE "projectId" IS NOT NULL
)
UPDATE "CalendarEntry"
SET "projectId" = NULL, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (SELECT "id" FROM ranked WHERE position > 1);

DROP INDEX "CalendarEntry_projectId_idx";
CREATE UNIQUE INDEX "CalendarEntry_projectId_key" ON "CalendarEntry"("projectId");
