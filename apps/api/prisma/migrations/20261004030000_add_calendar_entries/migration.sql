CREATE TABLE "CalendarEntry" (
"id" SERIAL PRIMARY KEY, "companyId" INTEGER NOT NULL, "projectId" INTEGER,
"title" TEXT NOT NULL, "recorderName" TEXT NOT NULL, "startDate" DATE NOT NULL,
"plannedEndDate" DATE, "memo" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "CalendarEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
CONSTRAINT "CalendarEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CalendarEntry_companyId_idx" ON "CalendarEntry"("companyId");
CREATE INDEX "CalendarEntry_projectId_idx" ON "CalendarEntry"("projectId");
