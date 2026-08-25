import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { effectiveTransactionStatus, validateTransactionStatus, type StoredTransactionStatus } from "../lib/transaction-status.js";
import { materializeRecurrences } from "../lib/recurrence.js";
import multer from "multer";
import { attachmentHash, attachmentPath, detectAttachment, maximumAttachmentSize, removeStoredAttachment, safeOriginalName, storeAttachment } from "../lib/attachments.js";

export const transactionsRouter = Router();
const attachmentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maximumAttachmentSize, files: 1 } });
const attachmentSelect = { id: true, originalName: true, mimeType: true, size: true, createdAt: true } as const;
const transactionSchema = z.object({
  description: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive().max(999999999999.99),
  type: z.enum(["INCOME", "EXPENSE"]),
  status: z.enum(["PENDING", "PAID", "RECEIVED", "CANCELED"]).optional(),
  date: z.coerce.date(),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid().nullish().transform((value) => value ?? null),
  notes: z.string().trim().max(500).nullish().transform((value) => value ?? null),
  cardId: z.string().uuid().nullish().transform((value) => value ?? null),
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

async function ensureAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId, isActive: true } });
  if (!account) throw new AppError("Conta não encontrada ou inativa", 404);
  return account;
}

async function ensureCard(userId: string, cardId: string) {
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId, isActive: true } });
  if (!card) throw new AppError("Cartão não encontrado ou inativo", 404);
  return card;
}

async function validateFinancialDestination(userId: string, data: { type: "INCOME" | "EXPENSE"; paymentMethod: string | null; accountId: string | null; cardId: string | null }) {
  if (data.type === "EXPENSE" && !data.paymentMethod) throw new AppError("Informe a forma de pagamento", 422);
  if (data.paymentMethod === "CREDIT_CARD") {
    if (!data.cardId) throw new AppError("Informe o cartão utilizado", 422);
    await ensureCard(userId, data.cardId);
    data.accountId = null;
    return;
  }
  data.cardId = null;
  if (!data.accountId) throw new AppError("Informe a conta da movimentação", 422);
  await ensureAccount(userId, data.accountId);
}

function resolveStatus(type: "INCOME" | "EXPENSE", status?: StoredTransactionStatus) {
  try {
    return validateTransactionStatus(type, status);
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : "Status incompatível com o lançamento", 422);
  }
}

transactionsRouter.get("/", async (request, response) => {
  const query = z.object({
    type: z.enum(["INCOME", "EXPENSE"]).optional(), categoryId: z.string().uuid().optional(),
    status: z.enum(["PENDING", "PAID", "RECEIVED", "OVERDUE", "CANCELED"]).optional(),
    from: z.coerce.date().optional(), to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(request.query);
  const recurrenceHorizon = query.to ?? new Date(Date.now() + 31 * 86_400_000);
  await materializeRecurrences(request.userId!, recurrenceHorizon);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dateFilter = { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }), ...(query.status === "OVERDUE" && { lt: todayUtc }) };
  const where = {
    userId: request.userId!,
    ...(query.type && { type: query.type }),
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...((query.from || query.to || query.status === "OVERDUE") && { date: dateFilter }),
    ...(query.status && { status: query.status === "OVERDUE" ? "PENDING" as const : query.status }),
  };
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({ where, include: { category: true, account: true, card: true, attachments: { select: attachmentSelect, orderBy: { createdAt: "desc" } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.transaction.count({ where }),
  ]);
  response.json({ items: items.map((item) => ({ ...item, effectiveStatus: effectiveTransactionStatus(item.status, item.date) })), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } });
});

transactionsRouter.post("/:id/attachments", attachmentUpload.single("file"), async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const transaction = await prisma.transaction.findFirst({ where: { id, userId: request.userId! }, select: { id: true, _count: { select: { attachments: true } } } });
  if (!transaction) throw new AppError("Lançamento não encontrado", 404);
  if (transaction._count.attachments >= 5) throw new AppError("Cada lançamento pode ter no máximo 5 anexos", 422);
  if (!request.file?.buffer.length) throw new AppError("Selecione um arquivo", 422);
  const detected = detectAttachment(request.file.buffer);
  if (!detected) throw new AppError("Formato inválido. Envie PDF, JPG, PNG ou WEBP", 422);
  const sha256 = attachmentHash(request.file.buffer);
  if (await prisma.transactionAttachment.findUnique({ where: { transactionId_sha256: { transactionId: id, sha256 } } })) throw new AppError("Este comprovante já está anexado ao lançamento", 409);
  const storedName = await storeAttachment(request.file.buffer, detected.extension);
  try {
    const attachment = await prisma.transactionAttachment.create({ data: { originalName: safeOriginalName(request.file.originalname), storedName, mimeType: detected.mimeType, size: request.file.size, sha256, userId: request.userId!, transactionId: id }, select: attachmentSelect });
    response.status(201).json(attachment);
  } catch (error) { await removeStoredAttachment(storedName); throw error; }
});

transactionsRouter.get("/:id/attachments/:attachmentId", async (request, response) => {
  const { id, attachmentId } = z.object({ id: z.string().uuid(), attachmentId: z.string().uuid() }).parse(request.params);
  const attachment = await prisma.transactionAttachment.findFirst({ where: { id: attachmentId, transactionId: id, userId: request.userId! } });
  if (!attachment) throw new AppError("Anexo não encontrado", 404);
  response.type(attachment.mimeType);
  response.download(attachmentPath(attachment.storedName), attachment.originalName);
});

transactionsRouter.delete("/:id/attachments/:attachmentId", async (request, response) => {
  const { id, attachmentId } = z.object({ id: z.string().uuid(), attachmentId: z.string().uuid() }).parse(request.params);
  const attachment = await prisma.transactionAttachment.findFirst({ where: { id: attachmentId, transactionId: id, userId: request.userId! } });
  if (!attachment) throw new AppError("Anexo não encontrado", 404);
  await prisma.transactionAttachment.delete({ where: { id: attachment.id } });
  await removeStoredAttachment(attachment.storedName);
  response.status(204).send();
});

transactionsRouter.post("/", async (request, response) => {
  const { installments, ...parsedData } = createTransactionSchema.parse(request.body);
  const data = { ...parsedData, status: resolveStatus(parsedData.type, parsedData.status) };
  await ensureCategory(request.userId!, data.categoryId, data.type);
  await validateFinancialDestination(request.userId!, data);
  if (installments > 1 && data.paymentMethod !== "CREDIT_CARD") throw new AppError("O parcelamento está disponível apenas para cartão de crédito", 422);
  const totalCents = Math.round(data.amount * 100);
  if (installments > totalCents) throw new AppError("O valor total deve permitir parcelas de pelo menos R$ 0,01", 422);
  if (installments === 1) {
    const transaction = await prisma.transaction.create({ data: { ...data, userId: request.userId! }, include: { category: true, account: true, card: true } });
    response.status(201).json(transaction);
    return;
  }
  const groupId = crypto.randomUUID();
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents % installments;
  const created = await prisma.$transaction(async (transaction) => {
    const items = [];
    for (let index = 0; index < installments; index += 1) {
      items.push(await transaction.transaction.create({
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
        include: { category: true, account: true, card: true },
      }));
    }
    return items;
  });
  response.status(201).json({ items: created, installments: created.length });
});

transactionsRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const parsedData = transactionSchema.parse(request.body);
  const data = { ...parsedData, status: resolveStatus(parsedData.type, parsedData.status) };
  await ensureCategory(request.userId!, data.categoryId, data.type);
  await validateFinancialDestination(request.userId!, data);
  const result = await prisma.transaction.updateMany({ where: { id, userId: request.userId! }, data });
  if (!result.count) throw new AppError("Transação não encontrada", 404);
  const transaction = await prisma.transaction.findUnique({ where: { id }, include: { category: true, account: true, card: true } });
  response.json(transaction ? { ...transaction, effectiveStatus: effectiveTransactionStatus(transaction.status, transaction.date) } : transaction);
});

transactionsRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const attachments = await prisma.transactionAttachment.findMany({ where: { transactionId: id, userId: request.userId! }, select: { storedName: true } });
  const result = await prisma.transaction.deleteMany({ where: { id, userId: request.userId! } });
  if (!result.count) throw new AppError("Transação não encontrada", 404);
  await Promise.all(attachments.map((attachment) => removeStoredAttachment(attachment.storedName)));
  response.status(204).send();
});
