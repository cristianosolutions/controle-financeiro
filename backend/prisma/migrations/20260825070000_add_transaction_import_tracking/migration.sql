ALTER TABLE "Transaction" ADD COLUMN "importFingerprint" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "importSource" TEXT;
CREATE UNIQUE INDEX "Transaction_userId_importFingerprint_key" ON "Transaction"("userId", "importFingerprint");
