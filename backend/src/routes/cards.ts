import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { invoiceDueDate, invoiceReferenceMonth } from "../lib/billing-cycle.js";
import { prisma } from "../lib/prisma.js";

export const cardsRouter = Router();

const cardSchema = z.object({
  name: z.string().trim().min(2).max(80),
  brand: z.string().trim().max(40).nullish().transform((value) => value || null),
  creditLimit: z.coerce.number().min(0).max(999999999999.99),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4f46e5"),
  isActive: z.boolean().default(true),
});

async function cardInvoices(cardId: string, userId: string) {
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new AppError("Cartão não encontrado", 404);
  const [transactions, payments] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, cardId, type: "EXPENSE", status: { not: "CANCELED" } }, include: { category: true }, orderBy: { date: "asc" } }),
    prisma.cardInvoicePayment.findMany({ where: { cardId }, include: { account: true } }),
  ]);
  const paymentMap = new Map(payments.map((payment) => [payment.referenceMonth, payment]));
  const invoices = new Map<string, { referenceMonth: string; dueDate: Date; total: number; items: typeof transactions; payment: (typeof payments)[number] | null }>();
  for (const transaction of transactions) {
    const referenceMonth = invoiceReferenceMonth(transaction.date, card.closingDay, card.dueDay);
    const current = invoices.get(referenceMonth) ?? { referenceMonth, dueDate: invoiceDueDate(referenceMonth, card.dueDay), total: 0, items: [], payment: paymentMap.get(referenceMonth) ?? null };
    current.total += transaction.amount.toNumber();
    current.items.push(transaction);
    invoices.set(referenceMonth, current);
  }
  return { card, invoices: [...invoices.values()].sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth)) };
}

cardsRouter.get("/", async (request, response) => {
  const cards = await prisma.creditCard.findMany({ where: { userId: request.userId! }, orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] });
  const result = await Promise.all(cards.map(async (card) => {
    const { invoices } = await cardInvoices(card.id, request.userId!);
    const usedLimit = invoices.filter((invoice) => !invoice.payment).reduce((sum, invoice) => sum + invoice.total, 0);
    const limit = card.creditLimit.toNumber();
    return { ...card, usedLimit, availableLimit: Math.max(0, limit - usedLimit) };
  }));
  response.json(result);
});

cardsRouter.post("/", async (request, response) => {
  const data = cardSchema.parse(request.body);
  const card = await prisma.creditCard.create({ data: { ...data, userId: request.userId! } });
  response.status(201).json({ ...card, usedLimit: 0, availableLimit: card.creditLimit.toNumber() });
});

cardsRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = cardSchema.parse(request.body);
  const result = await prisma.creditCard.updateMany({ where: { id, userId: request.userId! }, data });
  if (!result.count) throw new AppError("Cartão não encontrado", 404);
  response.json(await prisma.creditCard.findUnique({ where: { id } }));
});

cardsRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const card = await prisma.creditCard.findFirst({ where: { id, userId: request.userId! }, include: { _count: { select: { transactions: true } } } });
  if (!card) throw new AppError("Cartão não encontrado", 404);
  if (card._count.transactions) throw new AppError("Este cartão possui compras e não pode ser excluído. Desative-o para preservar o histórico", 422);
  await prisma.creditCard.delete({ where: { id } });
  response.status(204).send();
});

cardsRouter.get("/:id/invoices", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  response.json(await cardInvoices(id, request.userId!));
});

cardsRouter.post("/:id/invoices/:referenceMonth/pay", async (request, response) => {
  const { id, referenceMonth } = z.object({ id: z.string().uuid(), referenceMonth: z.string().regex(/^\d{4}-\d{2}$/) }).parse(request.params);
  const data = z.object({ accountId: z.string().uuid(), paidAt: z.coerce.date() }).parse(request.body);
  const account = await prisma.account.findFirst({ where: { id: data.accountId, userId: request.userId!, isActive: true } });
  if (!account) throw new AppError("Conta não encontrada ou inativa", 404);
  const { invoices } = await cardInvoices(id, request.userId!);
  const invoice = invoices.find((item) => item.referenceMonth === referenceMonth);
  if (!invoice) throw new AppError("Fatura não encontrada", 404);
  if (invoice.payment) throw new AppError("Esta fatura já foi paga", 422);
  const payment = await prisma.cardInvoicePayment.create({ data: { cardId: id, accountId: data.accountId, referenceMonth, amount: invoice.total, paidAt: data.paidAt }, include: { account: true } });
  response.status(201).json(payment);
});

cardsRouter.delete("/:id/invoices/:referenceMonth/payment", async (request, response) => {
  const { id, referenceMonth } = z.object({ id: z.string().uuid(), referenceMonth: z.string().regex(/^\d{4}-\d{2}$/) }).parse(request.params);
  const card = await prisma.creditCard.findFirst({ where: { id, userId: request.userId! } });
  if (!card) throw new AppError("Cartão não encontrado", 404);
  const result = await prisma.cardInvoicePayment.deleteMany({ where: { cardId: id, referenceMonth } });
  if (!result.count) throw new AppError("Pagamento não encontrado", 404);
  response.status(204).send();
});
