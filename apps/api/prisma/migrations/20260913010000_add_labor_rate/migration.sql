ALTER TABLE "Project"
ADD COLUMN "laborUnitPrice" INTEGER;

ALTER TABLE "CostEntry"
ADD COLUMN "laborCount" DECIMAL(5,1),
ADD COLUMN "laborUnitPrice" INTEGER;
