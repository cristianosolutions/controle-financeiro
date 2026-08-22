import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

export const adminUsersRouter = Router();
const publicUser = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } as const;
const createSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72), role: z.enum(["USER", "ADMIN"]).default("USER"), isActive: z.boolean().default(true),
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
  const user = await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 12) }, select: publicUser });
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
  response.json(await prisma.user.findUnique({ where: { id }, select: publicUser }));
});

adminUsersRouter.put("/:id/password", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const { password } = z.object({ password: z.string().min(8).max(72) }).parse(request.body);
  const result = await prisma.user.updateMany({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  if (!result.count) throw new AppError("Usuário não encontrado", 404);
  response.status(204).send();
});

adminUsersRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  if (id === request.userId) throw new AppError("Você não pode excluir a própria conta administrativa", 422);
  await ensureAnotherAdmin(id);
  const result = await prisma.user.deleteMany({ where: { id } });
  if (!result.count) throw new AppError("Usuário não encontrado", 404);
  response.status(204).send();
});
