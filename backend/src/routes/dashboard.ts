import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { effectiveTransactionStatus } from "../lib/transaction-status.js";
import { materializeRecurrences } from "../lib/recurrence.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (request, response) => {
  const { month } = z
    .object({
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    })
    .parse(request.query);
  const reference = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
  const from = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1),
  );
  const to = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1),
  );
  const previousFrom = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1),
  );
  await materializeRecurrences(request.userId!, to);
  const periodWhere = { userId: request.userId!, date: { gte: from, lt: to } };
  const realizedWhere = { ...periodWhere, status: { in: ["PAID" as const, "RECEIVED" as const] } };
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const overdueUpper = to < todayUtc ? to : todayUtc;
  const [totals, previousTotals, transactions, recent, pendingTotals, overdueCount] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: realizedWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId: request.userId!,
        date: { gte: previousFrom, lt: from },
        status: { in: ["PAID", "RECEIVED"] },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: realizedWhere,
      select: {
        amount: true,
        type: true,
        date: true,
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { ...periodWhere, status: { not: "CANCELED" } },
      include: { category: true, account: true, card: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { ...periodWhere, status: "PENDING" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.count({
      where: { userId: request.userId!, status: "PENDING", date: { gte: from, lt: overdueUpper } },
    }),
  ]);
  const income =
    totals.find((item) => item.type === "INCOME")?._sum.amount?.toNumber() ?? 0;
  const expense =
    totals.find((item) => item.type === "EXPENSE")?._sum.amount?.toNumber() ??
    0;
  const pendingIncome = pendingTotals.find((item) => item.type === "INCOME")?._sum.amount?.toNumber() ?? 0;
  const pendingExpense = pendingTotals.find((item) => item.type === "EXPENSE")?._sum.amount?.toNumber() ?? 0;
  const previousIncome =
    previousTotals
      .find((item) => item.type === "INCOME")
      ?._sum.amount?.toNumber() ?? 0;
  const previousExpense =
    previousTotals
      .find((item) => item.type === "EXPENSE")
      ?._sum.amount?.toNumber() ?? 0;
  const daysInMonth = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const trend = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    income: 0,
    expense: 0,
  }));
  const categoryTotals = new Map<
    string,
    { id: string; name: string; color: string; total: number }
  >();

  for (const transaction of transactions) {
    const day = transaction.date.getUTCDate() - 1;
    const amount = transaction.amount.toNumber();
    trend[day]![transaction.type === "INCOME" ? "income" : "expense"] +=
      amount;
    if (transaction.type === "EXPENSE") {
      const current = categoryTotals.get(transaction.category.id);
      categoryTotals.set(transaction.category.id, {
        ...transaction.category,
        total: (current?.total ?? 0) + amount,
      });
    }
  }
  response.json({
    month: from.toISOString().slice(0, 7),
    income,
    expense,
    balance: income - expense,
    transactionCount: totals.reduce((sum, item) => sum + item._count._all, 0),
    forecast: {
      pendingIncome,
      pendingExpense,
      projectedBalance: income - expense + pendingIncome - pendingExpense,
      pendingCount: pendingTotals.reduce((sum, item) => sum + item._count._all, 0),
      overdueCount,
    },
    previousMonth: {
      income: previousIncome,
      expense: previousExpense,
      balance: previousIncome - previousExpense,
    },
    trend,
    expenseCategories: [...categoryTotals.values()].sort(
      (first, second) => second.total - first.total,
    ),
    recent: recent.map((item) => ({ ...item, effectiveStatus: effectiveTransactionStatus(item.status, item.date) })),
  });
});
