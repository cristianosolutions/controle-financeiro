CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT', 'OTHER');

CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'CHECKING',
    "color" TEXT NOT NULL DEFAULT '#4f46e5',
    "initialBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_userId_name_key" ON "Account"("userId", "name");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Account" ("id", "name", "type", "color", "initialBalance", "isActive", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Conta principal', 'CHECKING'::"AccountType", '#4f46e5', 0, true, "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User";

ALTER TABLE "Transaction" ADD COLUMN "accountId" UUID;

UPDATE "Transaction" transaction
SET "accountId" = account."id"
FROM "Account" account
WHERE account."userId" = transaction."userId" AND account."name" = 'Conta principal';

ALTER TABLE "Transaction" ALTER COLUMN "accountId" SET NOT NULL;
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
