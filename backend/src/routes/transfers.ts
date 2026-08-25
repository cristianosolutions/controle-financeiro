import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

export const transfersRouter = Router();
const transferSchema = z.object({
  description: z.string().trim().min(2).max(120), amount: z.coerce.number().positive().max(999999999999.99), date: z.coerce.date(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELED"]).default("COMPLETED"),
  fromAccountId: z.string().uuid(), toAccountId: z.string().uuid(),
  notes: z.string().trim().max(500).nullish().transform((value) => value || null),
}).refine((data) => data.fromAccountId !== data.toAccountId, { message: "As contas de origem e destino devem ser diferentes", path: ["toAccountId"] });

async function ensureAccounts(userId: string, fromAccountId: string, toAccountId: string, requireActive = true) {
  const accounts = await prisma.account.findMany({ where: { userId, id: { in: [fromAccountId, toAccountId] }, ...(requireActive && { isActive: true }) }, select: { id: true } });
  if (accounts.length !== 2) throw new AppError("Conta de origem ou destino não encontrada ou inativa", 404);
}

transfersRouter.get("/", async (request, response) => {
  const query = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), status: z.enum(["PENDING", "COMPLETED", "CANCELED"]).optional() }).parse(request.query);
  response.json(await prisma.transfer.findMany({
    where: { userId: request.userId!, ...(query.status && { status: query.status }), ...((query.from || query.to) && { date: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) } }) },
    include: { fromAccount: true, toAccount: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  }));
});

transfersRouter.post("/", async (request, response) => {
  const data = transferSchema.parse(request.body);
  await ensureAccounts(request.userId!, data.fromAccountId, data.toAccountId);
  const transfer = await prisma.transfer.create({ data: { ...data, userId: request.userId! }, include: { fromAccount: true, toAccount: true } });
  response.status(201).json(transfer);
});

transfersRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = transferSchema.parse(request.body);
  const existing = await prisma.transfer.findFirst({ where: { id, userId: request.userId! }, select: { fromAccountId: true, toAccountId: true } });
  if (!existing) throw new AppError("Transferência não encontrada", 404);
  const accountsChanged = existing.fromAccountId !== data.fromAccountId || existing.toAccountId !== data.toAccountId;
  await ensureAccounts(request.userId!, data.fromAccountId, data.toAccountId, accountsChanged);
  const result = await prisma.transfer.updateMany({ where: { id, userId: request.userId! }, data });
  if (!result.count) throw new AppError("Transferência não encontrada", 404);
  response.json(await prisma.transfer.findUnique({ where: { id }, include: { fromAccount: true, toAccount: true } }));
});

transfersRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await prisma.transfer.deleteMany({ where: { id, userId: request.userId! } });
  if (!result.count) throw new AppError("Transferência não encontrada", 404);
  response.status(204).send();
});
