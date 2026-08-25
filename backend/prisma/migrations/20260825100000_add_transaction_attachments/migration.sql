CREATE TABLE "TransactionAttachment" (
  "id" UUID NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "transactionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransactionAttachment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TransactionAttachment_storedName_key" ON "TransactionAttachment"("storedName");
CREATE UNIQUE INDEX "TransactionAttachment_transactionId_sha256_key" ON "TransactionAttachment"("transactionId", "sha256");
CREATE INDEX "TransactionAttachment_userId_createdAt_idx" ON "TransactionAttachment"("userId", "createdAt");
CREATE INDEX "TransactionAttachment_transactionId_idx" ON "TransactionAttachment"("transactionId");
ALTER TABLE "TransactionAttachment" ADD CONSTRAINT "TransactionAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionAttachment" ADD CONSTRAINT "TransactionAttachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
