import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

export const transactionsRouter = Router();
const transactionSchema = z.object({
  description: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive().max(999999999999.99),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.coerce.date(),
  categoryId: z.string().uuid(),
  notes: z.string().trim().max(500).nullish().transform((value) => value ?? null),
});

async function ensureCategory(userId: string, categoryId: string, type: "INCOME" | "EXPENSE") {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw new AppError("Categoria não encontrada", 404);
  if (category.type && category.type !== type) throw new AppError("Categoria incompatível com o tipo da transação", 422);
}

transactionsRouter.get("/", async (request, response) => {
  const query = z.object({
    type: z.enum(["INCOME", "EXPENSE"]).optional(), categoryId: z.string().uuid().optional(),
    from: z.coerce.date().optional(), to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(request.query);
  const where = {
    userId: request.userId!,
    ...(query.type && { type: query.type }),
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...((query.from || query.to) && { date: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) } }),
  };
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({ where, include: { category: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.transaction.count({ where }),
  ]);
  response.json({ items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } });
});

transactionsRouter.post("/", async (request, response) => {
  const data = transactionSchema.parse(request.body);
  await ensureCategory(request.userId!, data.categoryId, data.type);
  const transaction = await prisma.transaction.create({ data: { ...data, userId: request.userId! }, include: { category: true } });
  response.status(201).json(transaction);
});

transactionsRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = transactionSchema.parse(request.body);
  await ensureCategory(request.userId!, data.categoryId, data.type);
  const result = await prisma.transaction.updateMany({ where: { id, userId: request.userId! }, data });
  if (!result.count) throw new AppError("Transação não encontrada", 404);
  response.json(await prisma.transaction.findUnique({ where: { id }, include: { category: true } }));
});

transactionsRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await prisma.transaction.deleteMany({ where: { id, userId: request.userId! } });
  if (!result.count) throw new AppError("Transação não encontrada", 404);
  response.status(204).send();
});
