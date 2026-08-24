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
  const where = { userId: request.userId!, date: { gte: from, lt: to } };
  const [totals, recent] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
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
  response.json({
    month: from.toISOString().slice(0, 7),
    income,
    expense,
    balance: income - expense,
    transactionCount: totals.reduce((sum, item) => sum + item._count._all, 0),
    recent,
  });
});
