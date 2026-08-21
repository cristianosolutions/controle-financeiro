import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const reportsRouter = Router();

reportsRouter.get("/financial", async (request, response) => {
  const query = z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    categoryId: z.string().uuid().optional(),
  }).refine(({ from, to }) => from <= to, { message: "A data inicial deve ser anterior à data final" }).parse(request.query);
  const where = {
    userId: request.userId!, date: { gte: query.from, lte: query.to },
    ...(query.type && { type: query.type }), ...(query.categoryId && { categoryId: query.categoryId }),
  };
  const items = await prisma.transaction.findMany({ where, include: { category: true }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  const income = items.reduce((sum, item) => sum + (item.type === "INCOME" ? item.amount.toNumber() : 0), 0);
  const expense = items.reduce((sum, item) => sum + (item.type === "EXPENSE" ? item.amount.toNumber() : 0), 0);
  const categoryMap = new Map<string, { id: string; name: string; color: string; type: string; total: number; count: number }>();
  for (const item of items) {
    const current = categoryMap.get(item.categoryId) ?? { id: item.category.id, name: item.category.name, color: item.category.color, type: item.type, total: 0, count: 0 };
    current.total += item.amount.toNumber(); current.count += 1; categoryMap.set(item.categoryId, current);
  }
  response.json({
    period: { from: query.from.toISOString(), to: query.to.toISOString() },
    totals: { income, expense, balance: income - expense, count: items.length },
    categories: [...categoryMap.values()].sort((a, b) => b.total - a.total), items,
  });
});
