import { Router } from "express";
import { invoiceDueDate, invoiceReferenceMonth } from "../lib/billing-cycle.js";
import { buildFinancialAlerts } from "../lib/financial-alerts.js";
import { prisma } from "../lib/prisma.js";

export const alertsRouter = Router();

alertsRouter.get("/", async (request, response) => {
  const userId = request.userId!;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const upcomingLimit = new Date(today);
  upcomingLimit.setUTCDate(upcomingLimit.getUTCDate() + 7);
  const month = today.toISOString().slice(0, 7);
  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  const [pendingTransactions, budgets, budgetTotals, cards, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, status: "PENDING", date: { lte: upcomingLimit } },
      select: { id: true, description: true, amount: true, date: true },
      orderBy: { date: "asc" },
    }),
    prisma.budget.findMany({ where: { userId, month }, include: { category: true } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", status: "PAID", date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.creditCard.findMany({
      where: { userId, isActive: true },
      include: {
        transactions: { where: { type: "EXPENSE", status: { not: "CANCELED" } }, select: { amount: true, date: true } },
        payments: { select: { referenceMonth: true } },
      },
    }),
    prisma.financialGoal.findMany({
      where: { userId, status: "ACTIVE", deadline: { not: null } },
      include: { contributions: { select: { amount: true } } },
    }),
  ]);

  const totalByCategory = new Map(budgetTotals.map((item) => [item.categoryId, item._sum.amount?.toNumber() ?? 0]));
  const invoices = cards.flatMap((card) => {
    const paid = new Set(card.payments.map((payment) => payment.referenceMonth));
    const totals = new Map<string, number>();
    for (const transaction of card.transactions) {
      const referenceMonth = invoiceReferenceMonth(transaction.date, card.closingDay, card.dueDay);
      totals.set(referenceMonth, (totals.get(referenceMonth) ?? 0) + transaction.amount.toNumber());
    }
    return [...totals].filter(([referenceMonth]) => !paid.has(referenceMonth)).map(([referenceMonth, total]) => ({
      cardId: card.id,
      cardName: card.name,
      referenceMonth,
      total,
      dueDate: invoiceDueDate(referenceMonth, card.dueDay),
    }));
  });

  const alerts = buildFinancialAlerts({
    today,
    pendingTransactions: pendingTransactions.map((item) => ({ ...item, amount: item.amount.toNumber() })),
    budgets: budgets.map((budget) => ({ id: budget.id, categoryName: budget.category.name, amount: budget.amount.toNumber(), spent: totalByCategory.get(budget.categoryId) ?? 0 })),
    invoices,
    goals: goals.map((goal) => ({ id: goal.id, name: goal.name, deadline: goal.deadline!, targetAmount: goal.targetAmount.toNumber(), currentAmount: goal.initialAmount.toNumber() + goal.contributions.reduce((sum, item) => sum + item.amount.toNumber(), 0) })),
  });

  response.json({ items: alerts.slice(0, 50), generatedAt: new Date().toISOString() });
});
