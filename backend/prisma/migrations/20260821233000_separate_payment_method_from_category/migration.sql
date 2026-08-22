CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'BOLETO', 'OTHER');
ALTER TABLE "Transaction" ADD COLUMN "paymentMethod" "PaymentMethod";

UPDATE "Transaction" SET "paymentMethod" = CASE
  WHEN "type" = 'EXPENSE' AND "cardName" IS NOT NULL THEN 'CREDIT_CARD'::"PaymentMethod"
  WHEN "type" = 'EXPENSE' THEN 'OTHER'::"PaymentMethod" ELSE NULL END;

INSERT INTO "Category" ("id", "name", "color", "type", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Outros', '#64748b', 'EXPENSE'::"TransactionType", source."userId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "userId" FROM "Category" WHERE lower("name") IN ('cartão de crédito','cartao de credito','cartão','cartao','crédito','credito')) source
WHERE NOT EXISTS (SELECT 1 FROM "Category" existing WHERE existing."userId" = source."userId" AND lower(existing."name") = 'outros');

UPDATE "Transaction" transaction SET "categoryId" = replacement."id"
FROM "Category" old_category, "Category" replacement
WHERE transaction."categoryId" = old_category."id" AND replacement."userId" = old_category."userId"
  AND lower(replacement."name") = 'outros'
  AND lower(old_category."name") IN ('cartão de crédito','cartao de credito','cartão','cartao','crédito','credito');

DELETE FROM "Category" WHERE lower("name") IN ('cartão de crédito','cartao de credito','cartão','cartao','crédito','credito');
