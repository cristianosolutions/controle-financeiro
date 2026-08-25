import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { generateResetToken, hashResetToken, strongPasswordSchema } from "../lib/security.js";
import { removeStoredAttachment } from "../lib/attachments.js";

export const adminUsersRouter = Router();
const publicUser = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } as const;
const createSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().email().toLowerCase(),
  password: strongPasswordSchema, role: z.enum(["USER", "ADMIN"]).default("USER"), isActive: z.boolean().default(true),
});
const updateSchema = createSchema.omit({ password: true }).partial().refine((data) => Object.keys(data).length > 0);

async function ensureAnotherAdmin(id: string) {
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (target?.role === "ADMIN" && await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } }) === 0) {
    throw new AppError("O sistema precisa manter pelo menos um administrador ativo", 422);
  }
}

adminUsersRouter.get("/", async (_request, response) => {
  response.json(await prisma.user.findMany({ select: { ...publicUser, _count: { select: { transactions: true } } }, orderBy: { createdAt: "desc" } }));
});

adminUsersRouter.post("/", async (request, response) => {
  const { password, ...data } = createSchema.parse(request.body);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (transaction) => {
    const created = await transaction.user.create({ data: { ...data, passwordHash }, select: publicUser });
    await transaction.account.create({ data: { name: "Conta principal", type: "CHECKING", color: "#4f46e5", userId: created.id } });
    return created;
  });
  await writeAudit(request, { action: "USER_CREATED", entityType: "User", entityId: user.id, description: `Usuário ${user.email} criado pelo administrador`, metadata: { role: user.role } });
  response.status(201).json(user);
});

adminUsersRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = updateSchema.parse(request.body);
  if (id === request.userId && (data.role === "USER" || data.isActive === false)) throw new AppError("Você não pode remover o próprio acesso administrativo", 422);
  if (data.role === "USER" || data.isActive === false) await ensureAnotherAdmin(id);
  const updateData = {
    ...(data.name !== undefined && { name: data.name }), ...(data.email !== undefined && { email: data.email }),
    ...(data.role !== undefined && { role: data.role }), ...(data.isActive !== undefined && { isActive: data.isActive }),
  };
  const result = await prisma.user.updateMany({ where: { id }, data: updateData });
  if (!result.count) throw new AppError("Usuário não encontrado", 404);
  await writeAudit(request, { action: "USER_UPDATED", entityType: "User", entityId: id, description: "Dados de usuário alterados pelo administrador", metadata: updateData });
  response.json(await prisma.user.findUnique({ where: { id }, select: publicUser }));
});

adminUsersRouter.put("/:id/password", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const { password } = z.object({ password: strongPasswordSchema }).parse(request.body);
  const result = await prisma.user.updateMany({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  if (!result.count) throw new AppError("Usuário não encontrado", 404);
  await prisma.authSession.updateMany({ where: { userId: id, revokedAt: null, ...(id === request.userId && request.sessionId ? { id: { not: request.sessionId } } : {}) }, data: { revokedAt: new Date() } });
  await writeAudit(request, { action: "PASSWORD_CHANGED_BY_ADMIN", entityType: "User", entityId: id, description: "Senha alterada pelo administrador; sessões encerradas" });
  response.status(204).send();
});

adminUsersRouter.post("/:id/recovery-code", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, isActive: true } });
  if (!user) throw new AppError("Usuário não encontrado", 404);
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.$transaction(async (transaction) => {
    await transaction.passwordResetToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: new Date() } });
    await transaction.passwordResetToken.create({ data: { userId: id, tokenHash: hashResetToken(token), expiresAt } });
  });
  await writeAudit(request, { action: "RECOVERY_CODE_CREATED", entityType: "User", entityId: id, description: `Código de recuperação temporário emitido para ${user.email}` });
  response.status(201).json({ token, expiresAt });
});

adminUsersRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  if (id === request.userId) throw new AppError("Você não pode excluir a própria conta administrativa", 422);
  await ensureAnotherAdmin(id);
  const attachments = await prisma.transactionAttachment.findMany({ where: { userId: id }, select: { storedName: true } });
  const result = await prisma.user.deleteMany({ where: { id } });
  if (!result.count) throw new AppError("Usuário não encontrado", 404);
  await writeAudit(request, { action: "USER_DELETED", entityType: "User", entityId: id, description: "Usuário excluído pelo administrador" });
  await Promise.all(attachments.map((attachment) => removeStoredAttachment(attachment.storedName)));
  response.status(204).send();
});
