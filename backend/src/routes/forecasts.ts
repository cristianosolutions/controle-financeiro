import { Router } from "express";
import { z } from "zod";
import { invoiceReferenceMonth } from "../lib/billing-cycle.js";
import { addMonth, buildFinancialForecast, type ForecastFlow } from "../lib/financial-forecast.js";
import { prisma } from "../lib/prisma.js";
import { materializeRecurrences } from "../lib/recurrence.js";

export const forecastsRouter = Router();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

forecastsRouter.get("/", async (request, response) => {
  const now = new Date();
  const defaultMonth = now.toISOString().slice(0, 7);
  const { startMonth, months } = z.object({
    startMonth: monthSchema.default(defaultMonth),
    months: z.coerce.number().int().min(3).max(24).default(6),
  }).parse(request.query);
  const endMonth = addMonth(startMonth, months);
  const horizonEnd = new Date(`${endMonth}-01T00:00:00.000Z`);
  await materializeRecurrences(request.userId!, horizonEnd);

  const [accounts, realizedTotals, invoicePaymentTotals, goalContributionTotals, pendingTransactions, cardPurchases, invoicePayments] = await Promise.all([
    prisma.account.findMany({ where: { userId: request.userId! }, select: { initialBalance: true } }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: request.userId!, accountId: { not: null }, paymentMethod: { not: "CREDIT_CARD" }, status: { in: ["PAID", "RECEIVED"] } },
      _sum: { amount: true },
    }),
    prisma.cardInvoicePayment.aggregate({ where: { account: { userId: request.userId! } }, _sum: { amount: true } }),
    prisma.goalContribution.aggregate({ where: { userId: request.userId!, accountId: { not: null } }, _sum: { amount: true } }),
    prisma.transaction.findMany({
      where: { userId: request.userId!, status: "PENDING", cardId: null, paymentMethod: { not: "CREDIT_CARD" }, date: { lt: horizonEnd } },
      select: { type: true, amount: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { userId: request.userId!, cardId: { not: null }, type: "EXPENSE", status: { not: "CANCELED" }, date: { lt: horizonEnd } },
      select: { cardId: true, amount: true, date: true, card: { select: { closingDay: true, dueDay: true } } },
    }),
    prisma.cardInvoicePayment.findMany({ where: { card: { userId: request.userId! } }, select: { cardId: true, referenceMonth: true } }),
  ]);

  const realizedIncome = realizedTotals.find((item) => item.type === "INCOME")?._sum.amount?.toNumber() ?? 0;
  const realizedExpense = realizedTotals.find((item) => item.type === "EXPENSE")?._sum.amount?.toNumber() ?? 0;
  const openingBalance = accounts.reduce((sum, account) => sum + account.initialBalance.toNumber(), 0)
    + realizedIncome - realizedExpense - (invoicePaymentTotals._sum.amount?.toNumber() ?? 0) - (goalContributionTotals._sum.amount?.toNumber() ?? 0);
  const normalizeMonth = (month: string) => month < startMonth ? startMonth : month;
  const flows: ForecastFlow[] = [];
  const pendingCounts = new Map<string, number>();
  const invoiceCounts = new Map<string, number>();

  for (const transaction of pendingTransactions) {
    const month = normalizeMonth(transaction.date.toISOString().slice(0, 7));
    if (month >= endMonth) continue;
    flows.push({ month, type: transaction.type, amount: transaction.amount.toNumber() });
    pendingCounts.set(month, (pendingCounts.get(month) ?? 0) + 1);
  }

  const paidInvoices = new Set(invoicePayments.map((payment) => `${payment.cardId}:${payment.referenceMonth}`));
  const invoiceTotals = new Map<string, number>();
  for (const purchase of cardPurchases) {
    if (!purchase.cardId || !purchase.card) continue;
    const referenceMonth = invoiceReferenceMonth(purchase.date, purchase.card.closingDay, purchase.card.dueDay);
    if (paidInvoices.has(`${purchase.cardId}:${referenceMonth}`)) continue;
    const month = normalizeMonth(referenceMonth);
    if (month >= endMonth) continue;
    const key = `${purchase.cardId}:${month}`;
    invoiceTotals.set(key, (invoiceTotals.get(key) ?? 0) + purchase.amount.toNumber());
  }
  for (const [key, amount] of invoiceTotals) {
    const month = key.slice(-7);
    flows.push({ month, type: "CARD_INVOICE", amount });
    invoiceCounts.set(month, (invoiceCounts.get(month) ?? 0) + 1);
  }

  const forecast = buildFinancialForecast(openingBalance, startMonth, months, flows);
  const monthsWithDetails = forecast.months.map((month) => ({
    ...month,
    pendingCount: pendingCounts.get(month.month) ?? 0,
    invoiceCount: invoiceCounts.get(month.month) ?? 0,
  }));
  const negativeMonths = monthsWithDetails.filter((month) => month.cumulativeBalance < 0);
  response.json({
    generatedAt: new Date().toISOString(),
    startMonth,
    monthsCount: months,
    ...forecast,
    months: monthsWithDetails,
    alerts: negativeMonths.map((month) => ({ type: "NEGATIVE_BALANCE" as const, month: month.month, amount: month.cumulativeBalance })),
  });
});
