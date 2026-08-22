-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "installmentGroupId" UUID,
ADD COLUMN "installmentNumber" INTEGER,
ADD COLUMN "installmentTotal" INTEGER;

-- CreateIndex
CREATE INDEX "Transaction_installmentGroupId_idx" ON "Transaction"("installmentGroupId");

-- Ensure installment metadata is either absent or complete and valid
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_installment_metadata_check"
CHECK (
  ("installmentGroupId" IS NULL AND "installmentNumber" IS NULL AND "installmentTotal" IS NULL)
  OR
  ("installmentGroupId" IS NOT NULL AND "installmentNumber" BETWEEN 1 AND "installmentTotal" AND "installmentTotal" BETWEEN 2 AND 60)
);
