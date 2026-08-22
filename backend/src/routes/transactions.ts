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
  cardName: z.string().trim().min(1).max(80).nullish().transform((value) => value || null),
  paymentMethod: z.enum(["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "BOLETO", "OTHER"]).nullish().transform((value) => value ?? null),
});
const createTransactionSchema = transactionSchema.extend({
  installments: z.coerce.number().int().min(1).max(60).default(1),
});

function addMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

async function ensureCategory(userId: string, categoryId: string, type: "INCOME" | "EXPENSE") {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw new AppError("Categoria não encontrada", 404);
  if (category.type && category.type !== type) throw new AppError("Categoria incompatível com o tipo da transação", 422);
  return category;
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
  const { installments, ...data } = createTransactionSchema.parse(request.body);
  await ensureCategory(request.userId!, data.categoryId, data.type);
  if (data.type === "EXPENSE" && !data.paymentMethod) throw new AppError("Informe a forma de pagamento", 422);
  if (data.paymentMethod === "CREDIT_CARD" && !data.cardName) throw new AppError("Informe o cartão utilizado", 422);
  if (data.paymentMethod !== "CREDIT_CARD") data.cardName = null;
  if (installments > 1 && data.paymentMethod !== "CREDIT_CARD") throw new AppError("O parcelamento está disponível apenas para cartão de crédito", 422);
  const totalCents = Math.round(data.amount * 100);
  if (installments > totalCents) throw new AppError("O valor total deve permitir parcelas de pelo menos R$ 0,01", 422);
  if (installments === 1) {
    const transaction = await prisma.transaction.create({ data: { ...data, userId: request.userId! }, include: { category: true } });
    response.status(201).json(transaction);
    return;
  }
  const groupId = crypto.randomUUID();
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents % installments;
  const operations = Array.from({ length: installments }, (_, index) => prisma.transaction.create({
    data: {
      ...data,
      description: `${data.description} (${index + 1}/${installments})`,
      amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
      date: addMonths(data.date, index),
      userId: request.userId!,
      installmentGroupId: groupId,
      installmentNumber: index + 1,
      installmentTotal: installments,
    },
    include: { category: true },
  }));
  const created = await prisma.$transaction(operations);
  response.status(201).json({ items: created, installments: created.length });
});

transactionsRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = transactionSchema.parse(request.body);
  await ensureCategory(request.userId!, data.categoryId, data.type);
  if (data.type === "EXPENSE" && !data.paymentMethod) throw new AppError("Informe a forma de pagamento", 422);
  if (data.paymentMethod === "CREDIT_CARD" && !data.cardName) throw new AppError("Informe o cartão utilizado", 422);
  if (data.paymentMethod !== "CREDIT_CARD") data.cardName = null;
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
