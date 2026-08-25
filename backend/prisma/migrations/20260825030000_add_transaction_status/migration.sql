CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'RECEIVED', 'CANCELED');

ALTER TABLE "Transaction" ADD COLUMN "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Transaction"
SET "status" = CASE
  WHEN "type" = 'INCOME' THEN 'RECEIVED'::"TransactionStatus"
  ELSE 'PAID'::"TransactionStatus"
END;

CREATE INDEX "Transaction_userId_status_date_idx" ON "Transaction"("userId", "status", "date");
