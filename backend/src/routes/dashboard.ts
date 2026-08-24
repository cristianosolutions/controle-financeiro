import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

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
  const where = { userId: request.userId!, date: { gte: from, lt: to } };
  const [totals, previousTotals, transactions, recent] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId: request.userId!,
        date: { gte: previousFrom, lt: from },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        type: true,
        date: true,
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);
  const income =
    totals.find((item) => item.type === "INCOME")?._sum.amount?.toNumber() ?? 0;
  const expense =
    totals.find((item) => item.type === "EXPENSE")?._sum.amount?.toNumber() ??
    0;
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
    previousMonth: {
      income: previousIncome,
      expense: previousExpense,
      balance: previousIncome - previousExpense,
    },
    trend,
    expenseCategories: [...categoryTotals.values()].sort(
      (first, second) => second.total - first.total,
    ),
    recent,
  });
});
