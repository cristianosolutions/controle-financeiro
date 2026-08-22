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
    if (typeof payload === "string" || typeof payload.sub !== "string") throw new Error("invalid payload");
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isActive: true } });
    if (!user?.isActive) throw new AppError("Usuário inexistente ou desativado", 403);
    request.userId = payload.sub;
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Token de acesso inválido ou expirado", 401);
  }
}
