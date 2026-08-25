import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { materializeRecurrences } from "../lib/recurrence.js";
import { removeStoredAttachment } from "../lib/attachments.js";
import { prisma } from "../lib/prisma.js";

export const recurrencesRouter = Router();

const recurrenceSchema = z.object({
  description: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive().max(999999999999.99),
  type: z.enum(["INCOME", "EXPENSE"]),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]),
  intervalDays: z.coerce.number().int().min(1).max(365).nullish().transform((value) => value ?? null),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullish().transform((value) => value ?? null),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid().nullish().transform((value) => value ?? null),
  cardId: z.string().uuid().nullish().transform((value) => value ?? null),
  notes: z.string().trim().max(500).nullish().transform((value) => value || null),
  paymentMethod: z.enum(["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "BOLETO", "OTHER"]).nullish().transform((value) => value ?? null),
  isActive: z.boolean().default(true),
}).superRefine((data, context) => {
  if (data.endDate && data.endDate < data.startDate) context.addIssue({ code: "custom", message: "A data final deve ser posterior à data inicial", path: ["endDate"] });
  if (data.frequency === "CUSTOM" && !data.intervalDays) context.addIssue({ code: "custom", message: "Informe o intervalo personalizado", path: ["intervalDays"] });
});

function generationHorizon() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date;
}

async function validateRelations(userId: string, data: z.infer<typeof recurrenceSchema>) {
  const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId } });
  if (!category) throw new AppError("Categoria não encontrada", 404);
  if (category.type && category.type !== data.type) throw new AppError("Categoria incompatível com o tipo do lançamento", 422);
  if (data.type === "EXPENSE" && !data.paymentMethod) throw new AppError("Informe a forma de pagamento", 422);
  if (data.type === "INCOME") data.paymentMethod = null;
  if (data.paymentMethod === "CREDIT_CARD") {
    if (!data.cardId) throw new AppError("Informe o cartão utilizado", 422);
    const card = await prisma.creditCard.findFirst({ where: { id: data.cardId, userId, isActive: true } });
    if (!card) throw new AppError("Cartão não encontrado ou inativo", 404);
    data.accountId = null;
  } else {
    data.cardId = null;
    if (!data.accountId) throw new AppError("Informe a conta da recorrência", 422);
    const account = await prisma.account.findFirst({ where: { id: data.accountId, userId, isActive: true } });
    if (!account) throw new AppError("Conta não encontrada ou inativa", 404);
  }
}

recurrencesRouter.get("/", async (request, response) => {
  await materializeRecurrences(request.userId!, generationHorizon());
  const items = await prisma.recurringTransaction.findMany({
    where: { userId: request.userId! },
    include: { category: true, account: true, card: true, _count: { select: { transactions: true } } },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
  response.json(items);
});

recurrencesRouter.post("/", async (request, response) => {
  const data = recurrenceSchema.parse(request.body);
  await validateRelations(request.userId!, data);
  const recurrence = await prisma.recurringTransaction.create({ data: { ...data, userId: request.userId! } });
  await materializeRecurrences(request.userId!, generationHorizon(), recurrence.id);
  response.status(201).json(recurrence);
});

recurrencesRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = recurrenceSchema.parse(request.body);
  await validateRelations(request.userId!, data);
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: request.userId! } });
  if (!existing) throw new AppError("Recorrência não encontrada", 404);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const attachments = await prisma.transactionAttachment.findMany({ where: { transaction: { recurringId: id, userId: request.userId!, status: "PENDING", date: { gte: today } } }, select: { storedName: true } });
  await prisma.$transaction(async (transaction) => {
    await transaction.transaction.deleteMany({ where: { recurringId: id, userId: request.userId!, status: "PENDING", date: { gte: today } } });
    await transaction.recurringTransaction.update({ where: { id }, data });
  });
  await Promise.all(attachments.map((attachment) => removeStoredAttachment(attachment.storedName)));
  if (data.isActive) await materializeRecurrences(request.userId!, generationHorizon(), id);
  response.json(await prisma.recurringTransaction.findUnique({ where: { id }, include: { category: true, account: true, card: true } }));
});

recurrencesRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: request.userId! } });
  if (!existing) throw new AppError("Recorrência não encontrada", 404);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const attachments = await prisma.transactionAttachment.findMany({ where: { transaction: { recurringId: id, userId: request.userId!, status: "PENDING", date: { gte: today } } }, select: { storedName: true } });
  await prisma.$transaction(async (transaction) => {
    await transaction.transaction.deleteMany({ where: { recurringId: id, userId: request.userId!, status: "PENDING", date: { gte: today } } });
    await transaction.recurringTransaction.delete({ where: { id } });
  });
  await Promise.all(attachments.map((attachment) => removeStoredAttachment(attachment.storedName)));
  response.status(204).send();
});
