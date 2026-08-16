BEGIN;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "companyId" INTEGER;

DO $$
DECLARE
  legacy_company_id INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM "Project" WHERE "companyId" IS NULL) THEN
    SELECT "id"
    INTO legacy_company_id
    FROM "Company"
    WHERE "code" = 'GENBA001';

    IF legacy_company_id IS NULL THEN
      RAISE EXCEPTION 'GENBA001 が存在しないため、既存Projectを移行できません';
    END IF;

    UPDATE "Project"
    SET "companyId" = legacy_company_id
    WHERE "companyId" IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM "Project" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'companyIdが未設定のProjectが残っているため、移行できません';
  END IF;
END $$;

ALTER TABLE "Project" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
