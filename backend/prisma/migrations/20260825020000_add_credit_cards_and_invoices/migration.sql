CREATE TABLE "CreditCard" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#4f46e5',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CardInvoicePayment" (
    "id" UUID NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "cardId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CardInvoicePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditCard_userId_idx" ON "CreditCard"("userId");
CREATE UNIQUE INDEX "CreditCard_userId_name_key" ON "CreditCard"("userId", "name");
CREATE UNIQUE INDEX "CardInvoicePayment_cardId_referenceMonth_key" ON "CardInvoicePayment"("cardId", "referenceMonth");
CREATE INDEX "CardInvoicePayment_accountId_idx" ON "CardInvoicePayment"("accountId");

ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardInvoicePayment" ADD CONSTRAINT "CardInvoicePayment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardInvoicePayment" ADD CONSTRAINT "CardInvoicePayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CreditCard" ("id", "name", "brand", "creditLimit", "closingDay", "dueDay", "color", "isActive", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), source."cardName", NULL, 0, 1, 10, '#4f46e5', true, source."userId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "userId", "cardName" FROM "Transaction" WHERE "cardName" IS NOT NULL) source;

ALTER TABLE "Transaction" ADD COLUMN "cardId" UUID;

UPDATE "Transaction" transaction SET "cardId" = card."id"
FROM "CreditCard" card
WHERE card."userId" = transaction."userId" AND card."name" = transaction."cardName";

ALTER TABLE "Transaction" ALTER COLUMN "accountId" DROP NOT NULL;
ALTER TABLE "Transaction" DROP COLUMN "cardName";
CREATE INDEX "Transaction_cardId_idx" ON "Transaction"("cardId");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
