CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED');

CREATE TABLE "FinancialGoal" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "targetAmount" DECIMAL(14,2) NOT NULL,
  "initialAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "deadline" TIMESTAMP(3),
  "color" TEXT NOT NULL DEFAULT '#4f46e5',
  "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoalContribution" (
  "id" UUID NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "userId" UUID NOT NULL,
  "goalId" UUID NOT NULL,
  "accountId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoalContribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialGoal_userId_status_idx" ON "FinancialGoal"("userId", "status");
CREATE INDEX "GoalContribution_userId_date_idx" ON "GoalContribution"("userId", "date");
CREATE INDEX "GoalContribution_goalId_idx" ON "GoalContribution"("goalId");
CREATE INDEX "GoalContribution_accountId_idx" ON "GoalContribution"("accountId");

ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "FinancialGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalContribution" ADD CONSTRAINT "GoalContribution_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
