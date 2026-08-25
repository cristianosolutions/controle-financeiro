import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { budgetProgress } from "../lib/budget-progress.js";
import { prisma } from "../lib/prisma.js";

export const budgetsRouter = Router();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const budgetSchema = z.object({
  month: monthSchema,
  categoryId: z.string().uuid(),
  amount: z.coerce.number().positive().max(999999999999.99),
});

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    from: new Date(Date.UTC(year!, monthNumber! - 1, 1)),
    to: new Date(Date.UTC(year!, monthNumber!, 1)),
  };
}

async function budgetsWithProgress(userId: string, month: string) {
  const { from, to } = monthRange(month);
  const [budgets, totals] = await Promise.all([
    prisma.budget.findMany({ where: { userId, month }, include: { category: true }, orderBy: { category: { name: "asc" } } }),
    prisma.transaction.groupBy({
      by: ["categoryId", "status"],
      where: { userId, type: "EXPENSE", date: { gte: from, lt: to }, status: { in: ["PAID", "PENDING"] } },
      _sum: { amount: true },
    }),
  ]);
  return budgets.map((budget) => {
    const spent = totals.find((item) => item.categoryId === budget.categoryId && item.status === "PAID")?._sum.amount?.toNumber() ?? 0;
    const pending = totals.find((item) => item.categoryId === budget.categoryId && item.status === "PENDING")?._sum.amount?.toNumber() ?? 0;
    return { ...budget, ...budgetProgress(budget.amount.toNumber(), spent, pending) };
  });
}

budgetsRouter.get("/", async (request, response) => {
  const { month } = z.object({ month: monthSchema }).parse(request.query);
  response.json(await budgetsWithProgress(request.userId!, month));
});

budgetsRouter.post("/", async (request, response) => {
  const data = budgetSchema.parse(request.body);
  const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId: request.userId! } });
  if (!category) throw new AppError("Categoria não encontrada", 404);
  if (category.type === "INCOME") throw new AppError("Orçamentos devem utilizar categorias de despesa", 422);
  await prisma.budget.upsert({
    where: { userId_categoryId_month: { userId: request.userId!, categoryId: data.categoryId, month: data.month } },
    create: { ...data, userId: request.userId! },
    update: { amount: data.amount },
  });
  const budgets = await budgetsWithProgress(request.userId!, data.month);
  response.status(201).json(budgets.find((budget) => budget.categoryId === data.categoryId));
});

budgetsRouter.post("/copy", async (request, response) => {
  const { fromMonth, toMonth } = z.object({ fromMonth: monthSchema, toMonth: monthSchema }).refine((data) => data.fromMonth !== data.toMonth, { message: "Selecione meses diferentes" }).parse(request.body);
  const source = await prisma.budget.findMany({ where: { userId: request.userId!, month: fromMonth } });
  await prisma.budget.createMany({ data: source.map((budget) => ({ userId: request.userId!, categoryId: budget.categoryId, month: toMonth, amount: budget.amount })), skipDuplicates: true });
  response.status(201).json(await budgetsWithProgress(request.userId!, toMonth));
});

budgetsRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await prisma.budget.deleteMany({ where: { id, userId: request.userId! } });
  if (!result.count) throw new AppError("Orçamento não encontrado", 404);
  response.status(204).send();
});
