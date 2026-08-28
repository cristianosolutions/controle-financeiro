import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { hashResetToken, sessionDescription, strongPasswordSchema } from "../lib/security.js";
import { writeAudit } from "../lib/audit.js";
import { authenticate } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rate-limit.js";
import {
  attachmentPath,
  detectAttachment,
  removeStoredAttachment,
  storeAttachment,
} from "../lib/attachments.js";

export const authRouter = Router();
const credentialsSchema = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(8).max(72) });
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  avatarStoredName: true,
  createdAt: true,
} as const;
const publicUser = <T extends { avatarStoredName: string | null }>(user: T) => {
  const { avatarStoredName, ...publicData } = user;
  return { ...publicData, hasAvatar: Boolean(avatarStoredName) };
};

authRouter.post("/register", authRateLimit, async (request, response) => {
  const data = z.object({ email: z.string().email().toLowerCase(), password: strongPasswordSchema, name: z.string().trim().min(2).max(100) }).parse(request.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.$transaction(async (transaction) => {
    const created = await transaction.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: publicUserSelect,
    });
    await transaction.account.create({ data: { name: "Conta principal", type: "CHECKING", color: "#4f46e5", userId: created.id } });
    return created;
  });
  await writeAudit(request, { action: "USER_REGISTERED", entityType: "User", entityId: user.id, description: "Nova conta criada" });
  response.status(201).json(publicUser(user));
});

authRouter.post("/login", authRateLimit, async (request, response) => {
  const data = credentialsSchema.parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    await writeAudit(request, { action: "LOGIN_FAILED", entityType: "AuthSession", description: "Tentativa de login com credenciais inválidas", metadata: { email: data.email } });
    throw new AppError("E-mail ou senha inválidos", 401);
  }
  if (!user.isActive) {
    await writeAudit(request, { action: "LOGIN_BLOCKED", entityType: "User", entityId: user.id, description: "Tentativa de acesso a usuário desativado" });
    throw new AppError("Usuário desativado. Procure um administrador", 403);
  }
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const session = await prisma.authSession.create({ data: { userId: user.id, expiresAt, ipAddress: request.ip || null, userAgent: request.get("user-agent")?.slice(0, 500) ?? null } });
  const token = jwt.sign({}, env.JWT_SECRET, { subject: user.id, jwtid: session.id, expiresIn: "7d" });
  request.userId = user.id;
  await writeAudit(request, { action: "LOGIN", entityType: "AuthSession", entityId: session.id, description: "Login realizado com sucesso" });
  response.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      hasAvatar: Boolean(user.avatarStoredName),
    },
  });
});

authRouter.get("/avatar", authenticate, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.userId! },
    select: { avatarStoredName: true },
  });
  if (!user?.avatarStoredName) throw new AppError("Foto de perfil não encontrada", 404);
  response.sendFile(attachmentPath(user.avatarStoredName));
});

authRouter.put(
  "/avatar",
  authenticate,
  avatarUpload.single("file"),
  async (request, response) => {
    if (!request.file) throw new AppError("Selecione uma imagem", 422);
    const detected = detectAttachment(request.file.buffer);
    if (!detected || detected.mimeType === "application/pdf") {
      throw new AppError("Envie uma imagem JPG, PNG ou WEBP", 422);
    }
    const current = await prisma.user.findUnique({
      where: { id: request.userId! },
      select: { avatarStoredName: true },
    });
    if (!current) throw new AppError("Usuário não encontrado", 404);
    const storedName = await storeAttachment(request.file.buffer, detected.extension);
    const user = await prisma.user
      .update({
        where: { id: request.userId! },
        data: { avatarStoredName: storedName },
        select: publicUserSelect,
      })
      .catch(async (error: unknown) => {
        await removeStoredAttachment(storedName);
        throw error;
      });
    if (current.avatarStoredName) await removeStoredAttachment(current.avatarStoredName);
    await writeAudit(request, {
      action: "PROFILE_PHOTO_UPDATED",
      entityType: "User",
      entityId: request.userId!,
      description: "Foto de perfil atualizada",
    });
    response.json(publicUser(user));
  },
);

authRouter.delete("/avatar", authenticate, async (request, response) => {
  const current = await prisma.user.findUnique({
    where: { id: request.userId! },
    select: { avatarStoredName: true },
  });
  if (!current) throw new AppError("Usuário não encontrado", 404);
  await prisma.user.update({
    where: { id: request.userId! },
    data: { avatarStoredName: null },
  });
  if (current.avatarStoredName) await removeStoredAttachment(current.avatarStoredName);
  await writeAudit(request, {
    action: "PROFILE_PHOTO_REMOVED",
    entityType: "User",
    entityId: request.userId!,
    description: "Foto de perfil removida",
  });
  response.status(204).send();
});

authRouter.post("/logout", authenticate, async (request, response) => {
  await prisma.authSession.updateMany({ where: { id: request.sessionId!, userId: request.userId! }, data: { revokedAt: new Date() } });
  await writeAudit(request, { action: "LOGOUT", entityType: "AuthSession", entityId: request.sessionId!, description: "Sessão encerrada" });
  response.status(204).send();
});

authRouter.get("/sessions", authenticate, async (request, response) => {
  const sessions = await prisma.authSession.findMany({ where: { userId: request.userId!, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastUsedAt: "desc" } });
  response.json(sessions.map((session) => ({ id: session.id, description: sessionDescription(session.userAgent), ipAddress: session.ipAddress, createdAt: session.createdAt, lastUsedAt: session.lastUsedAt, expiresAt: session.expiresAt, current: session.id === request.sessionId })));
});

authRouter.delete("/sessions/:id", authenticate, async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await prisma.authSession.updateMany({ where: { id, userId: request.userId!, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) throw new AppError("Sessão não encontrada", 404);
  await writeAudit(request, { action: "SESSION_REVOKED", entityType: "AuthSession", entityId: id, description: id === request.sessionId ? "Sessão atual revogada" : "Outro dispositivo desconectado" });
  response.status(204).send();
});

authRouter.put("/password", authenticate, async (request, response) => {
  const data = z.object({ currentPassword: z.string().min(1), newPassword: strongPasswordSchema }).parse(request.body);
  const user = await prisma.user.findUnique({ where: { id: request.userId! } });
  if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) throw new AppError("Senha atual incorreta", 422);
  if (await bcrypt.compare(data.newPassword, user.passwordHash)) throw new AppError("A nova senha deve ser diferente da atual", 422);
  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id: user.id }, data: { passwordHash } });
    await transaction.authSession.updateMany({ where: { userId: user.id, id: { not: request.sessionId! }, revokedAt: null }, data: { revokedAt: new Date() } });
  });
  await writeAudit(request, { action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id, description: "Senha alterada pelo próprio usuário" });
  response.status(204).send();
});

authRouter.post("/reset-password", authRateLimit, async (request, response) => {
  const data = z.object({ token: z.string().min(20).max(200), password: strongPasswordSchema }).parse(request.body);
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(data.token) } });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) throw new AppError("Código de recuperação inválido ou expirado", 422);
  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await transaction.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    await transaction.authSession.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
  await writeAudit(request, { action: "PASSWORD_RESET", entityType: "User", entityId: reset.userId, description: "Senha redefinida com código de recuperação" });
  response.status(204).send();
});

authRouter.get("/me", authenticate, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.userId! },
    select: publicUserSelect,
  });
  if (!user) throw new AppError("Usuário não encontrado", 404);
  response.json(publicUser(user));
});
