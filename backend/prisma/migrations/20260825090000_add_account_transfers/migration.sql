CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');
CREATE TABLE "Transfer" (
  "id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "status" "TransferStatus" NOT NULL DEFAULT 'COMPLETED',
  "notes" TEXT,
  "userId" UUID NOT NULL,
  "fromAccountId" UUID NOT NULL,
  "toAccountId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Transfer_accounts_different" CHECK ("fromAccountId" <> "toAccountId")
);
CREATE INDEX "Transfer_userId_date_idx" ON "Transfer"("userId", "date");
CREATE INDEX "Transfer_fromAccountId_idx" ON "Transfer"("fromAccountId");
CREATE INDEX "Transfer_toAccountId_idx" ON "Transfer"("toAccountId");
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
