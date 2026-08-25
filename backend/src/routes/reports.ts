import { Router } from "express";
import { z } from "zod";
import { invoiceReferenceMonth } from "../lib/billing-cycle.js";
import { percentageChange, reportAnalytics } from "../lib/report-analytics.js";
import { prisma } from "../lib/prisma.js";
import { effectiveTransactionStatus } from "../lib/transaction-status.js";

export const reportsRouter = Router();
const paymentMethods = ["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "BOLETO", "OTHER"] as const;

reportsRouter.get("/financial", async (request, response) => {
  const query = z.object({
    from: z.coerce.date(), to: z.coerce.date(), type: z.enum(["INCOME", "EXPENSE"]).optional(),
    categoryId: z.string().uuid().optional(), accountId: z.string().uuid().optional(), cardId: z.string().uuid().optional(),
    paymentMethod: z.enum(paymentMethods).optional(),
    status: z.enum(["PENDING", "PAID", "RECEIVED", "OVERDUE", "CANCELED"]).optional(),
  }).refine(({ from, to }) => from <= to, { message: "A data inicial deve ser anterior à data final" }).parse(request.query);
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const baseWhere = {
    userId: request.userId!, ...(query.type && { type: query.type }), ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.accountId && { accountId: query.accountId }), ...(query.cardId && { cardId: query.cardId }),
    ...(query.paymentMethod && { paymentMethod: query.paymentMethod }),
    status: query.status ? (query.status === "OVERDUE" ? "PENDING" as const : query.status) : { not: "CANCELED" as const },
  };
  const periodDuration = query.to.getTime() - query.from.getTime();
  const previousTo = new Date(query.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - periodDuration);
  const currentDateWhere = { gte: query.from, lte: query.to, ...(query.status === "OVERDUE" && { lt: todayUtc }) };
  const previousDateWhere = { gte: previousFrom, lte: previousTo, ...(query.status === "OVERDUE" && { lt: todayUtc }) };

  const [items, previousItems, accounts, goals, realizedTransactions, invoicePayments, goalContributions, cardPurchases] = await Promise.all([
    prisma.transaction.findMany({ where: { ...baseWhere, date: currentDateWhere }, include: { category: true, account: true, card: true }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
    prisma.transaction.findMany({ where: { ...baseWhere, date: previousDateWhere }, select: { amount: true, type: true } }),
    prisma.account.findMany({ where: { userId: request.userId!, createdAt: { lte: query.to } }, select: { initialBalance: true, createdAt: true } }),
    prisma.financialGoal.findMany({ where: { userId: request.userId!, createdAt: { lte: query.to } }, select: { initialAmount: true, createdAt: true } }),
    prisma.transaction.findMany({ where: { userId: request.userId!, accountId: { not: null }, paymentMethod: { not: "CREDIT_CARD" }, status: { in: ["PAID", "RECEIVED"] }, date: { lte: query.to } }, select: { amount: true, type: true, date: true } }),
    prisma.cardInvoicePayment.findMany({ where: { card: { userId: request.userId! }, paidAt: { lte: query.to } }, select: { cardId: true, referenceMonth: true, amount: true, paidAt: true } }),
    prisma.goalContribution.findMany({ where: { userId: request.userId!, date: { lte: query.to } }, select: { amount: true, date: true, accountId: true } }),
    prisma.transaction.findMany({ where: { userId: request.userId!, cardId: { not: null }, type: "EXPENSE", status: { not: "CANCELED" }, date: { lte: query.to } }, select: { cardId: true, amount: true, date: true, card: { select: { closingDay: true, dueDay: true } } } }),
  ]);

  const summarize = (list: Array<{ amount: { toNumber(): number }; type: "INCOME" | "EXPENSE" }>) => {
    const income = list.reduce((sum, item) => sum + (item.type === "INCOME" ? item.amount.toNumber() : 0), 0);
    const expense = list.reduce((sum, item) => sum + (item.type === "EXPENSE" ? item.amount.toNumber() : 0), 0);
    return { income, expense, balance: income - expense, count: list.length };
  };
  const totals = summarize(items);
  const previousTotals = summarize(previousItems);
  const categoryMap = new Map<string, { id: string; name: string; color: string; type: string; total: number; count: number }>();
  for (const item of items) {
    const current = categoryMap.get(item.categoryId) ?? { id: item.category.id, name: item.category.name, color: item.category.color, type: item.type, total: 0, count: 0 };
    current.total += item.amount.toNumber(); current.count += 1; categoryMap.set(item.categoryId, current);
  }
  const analytics = reportAnalytics(items.map((item) => ({ amount: item.amount.toNumber(), type: item.type, date: item.date, account: item.account, card: item.card, paymentMethod: item.paymentMethod })));

  const timeline: Array<{ month: string; liquidBalance: number; goalSavings: number; cardDebt: number; netWorth: number }> = [];
  let cursor = new Date(Date.UTC(query.from.getUTCFullYear(), query.from.getUTCMonth(), 1));
  while (cursor <= query.to) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const snapshot = new Date(Math.min(next.getTime() - 1, query.to.getTime()));
    const initialBalance = accounts.filter((account) => account.createdAt <= snapshot).reduce((sum, account) => sum + account.initialBalance.toNumber(), 0);
    const realizedIncome = realizedTransactions.filter((item) => item.date <= snapshot && item.type === "INCOME").reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const realizedExpense = realizedTransactions.filter((item) => item.date <= snapshot && item.type === "EXPENSE").reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const paidInvoices = invoicePayments.filter((payment) => payment.paidAt <= snapshot).reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const linkedContributions = goalContributions.filter((item) => item.date <= snapshot && item.accountId).reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const liquidBalance = initialBalance + realizedIncome - realizedExpense - paidInvoices - linkedContributions;
    const goalSavings = goals.filter((goal) => goal.createdAt <= snapshot).reduce((sum, goal) => sum + goal.initialAmount.toNumber(), 0)
      + goalContributions.filter((item) => item.date <= snapshot).reduce((sum, item) => sum + item.amount.toNumber(), 0);
    const cardDebt = cardPurchases.filter((purchase) => {
      if (purchase.date > snapshot || !purchase.cardId || !purchase.card) return false;
      const referenceMonth = invoiceReferenceMonth(purchase.date, purchase.card.closingDay, purchase.card.dueDay);
      return !invoicePayments.some((payment) => payment.cardId === purchase.cardId && payment.referenceMonth === referenceMonth && payment.paidAt <= snapshot);
    }).reduce((sum, purchase) => sum + purchase.amount.toNumber(), 0);
    timeline.push({ month: cursor.toISOString().slice(0, 7), liquidBalance, goalSavings, cardDebt, netWorth: liquidBalance + goalSavings - cardDebt });
    cursor = next;
  }

  response.json({
    period: { from: query.from.toISOString(), to: query.to.toISOString() }, totals,
    comparison: { period: { from: previousFrom.toISOString(), to: previousTo.toISOString() }, totals: previousTotals, change: { income: percentageChange(totals.income, previousTotals.income), expense: percentageChange(totals.expense, previousTotals.expense), balance: percentageChange(totals.balance, previousTotals.balance) } },
    categories: [...categoryMap.values()].sort((a, b) => b.total - a.total),
    analytics: { ...analytics, netWorth: timeline },
    items: items.map((item) => ({ ...item, effectiveStatus: effectiveTransactionStatus(item.status, item.date) })),
  });
});
