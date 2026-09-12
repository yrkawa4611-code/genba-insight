ALTER TABLE "Project"
ALTER COLUMN "targetProfitMargin" TYPE INTEGER
USING FLOOR("targetProfitMargin")::INTEGER;
