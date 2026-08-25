import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) throw new AppError("Token de acesso ausente", 401);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.jti !== "string") throw new Error("invalid payload");
    const session = await prisma.authSession.findUnique({ where: { id: payload.jti }, include: { user: { select: { isActive: true } } } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) throw new Error("invalid session");
    if (!session.user.isActive) throw new AppError("Usuário inexistente ou desativado", 403);
    request.userId = payload.sub;
    request.sessionId = payload.jti;
    if (Date.now() - session.lastUsedAt.getTime() > 5 * 60 * 1000) await prisma.authSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Token de acesso inválido ou expirado", 401);
  }
}
