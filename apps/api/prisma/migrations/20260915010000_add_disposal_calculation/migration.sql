ALTER TABLE "CostEntry"
ADD COLUMN "disposalQuantity" DECIMAL(7,1),
ADD COLUMN "disposalUnit" TEXT,
ADD COLUMN "disposalUnitPrice" INTEGER,
ADD COLUMN "disposalTaxRate" DECIMAL(5,2),
ADD COLUMN "disposalSubtotal" INTEGER,
ADD COLUMN "disposalTaxAmount" INTEGER;
