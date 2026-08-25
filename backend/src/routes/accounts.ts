import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { transferEffect } from "../lib/transfer-balance.js";

export const accountsRouter = Router();

const accountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["CHECKING", "SAVINGS", "CASH", "INVESTMENT", "OTHER"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4f46e5"),
  initialBalance: z.coerce.number().min(-999999999999.99).max(999999999999.99).default(0),
  isActive: z.boolean().default(true),
});

accountsRouter.get("/", async (request, response) => {
  const accounts = await prisma.account.findMany({
    where: { userId: request.userId! },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
  const [totals, invoicePayments, goalContributions, transfers] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId: request.userId!, accountId: { not: null }, paymentMethod: { not: "CREDIT_CARD" }, status: { in: ["PAID", "RECEIVED"] } },
      _sum: { amount: true },
    }),
    prisma.cardInvoicePayment.groupBy({
      by: ["accountId"],
      where: { account: { userId: request.userId! } },
      _sum: { amount: true },
    }),
    prisma.goalContribution.groupBy({
      by: ["accountId"],
      where: { userId: request.userId!, accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.transfer.findMany({ where: { userId: request.userId!, status: "COMPLETED", date: { lte: new Date() } }, select: { fromAccountId: true, toAccountId: true, amount: true, status: true } }),
  ]);
  response.json(accounts.map((account) => {
    const income = totals.find((item) => item.accountId === account.id && item.type === "INCOME")?._sum.amount?.toNumber() ?? 0;
    const expense = totals.find((item) => item.accountId === account.id && item.type === "EXPENSE")?._sum.amount?.toNumber() ?? 0;
    const paidInvoices = invoicePayments.find((item) => item.accountId === account.id)?._sum.amount?.toNumber() ?? 0;
    const savedInGoals = goalContributions.find((item) => item.accountId === account.id)?._sum.amount?.toNumber() ?? 0;
    const transferBalance = transferEffect(account.id, transfers.map((item) => ({ ...item, amount: item.amount.toNumber() })));
    return { ...account, balance: account.initialBalance.toNumber() + income - expense - paidInvoices - savedInGoals + transferBalance };
  }));
});

accountsRouter.post("/", async (request, response) => {
  const data = accountSchema.parse(request.body);
  const account = await prisma.account.create({ data: { ...data, userId: request.userId! } });
  response.status(201).json({ ...account, balance: account.initialBalance.toNumber() });
});

accountsRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = accountSchema.parse(request.body);
  if (!data.isActive) {
    const activeCount = await prisma.account.count({ where: { userId: request.userId!, isActive: true, id: { not: id } } });
    if (!activeCount) throw new AppError("Mantenha pelo menos uma conta ativa", 422);
  }
  const result = await prisma.account.updateMany({ where: { id, userId: request.userId! }, data });
  if (!result.count) throw new AppError("Conta não encontrada", 404);
  response.json(await prisma.account.findUnique({ where: { id } }));
});

accountsRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const account = await prisma.account.findFirst({ where: { id, userId: request.userId! }, include: { _count: { select: { transactions: true, goalContributions: true, outgoingTransfers: true, incomingTransfers: true } } } });
  if (!account) throw new AppError("Conta não encontrada", 404);
  if (account._count.transactions) throw new AppError("Esta conta possui lançamentos e não pode ser excluída. Desative-a para preservar o histórico", 422);
  if (account._count.goalContributions) throw new AppError("Esta conta possui aportes em metas e não pode ser excluída. Desative-a para preservar o histórico", 422);
  if (account._count.outgoingTransfers || account._count.incomingTransfers) throw new AppError("Esta conta possui transferências e não pode ser excluída. Desative-a para preservar o histórico", 422);
  const activeCount = await prisma.account.count({ where: { userId: request.userId!, isActive: true, id: { not: id } } });
  if (!activeCount) throw new AppError("Mantenha pelo menos uma conta ativa", 422);
  await prisma.account.delete({ where: { id } });
  response.status(204).send();
});
