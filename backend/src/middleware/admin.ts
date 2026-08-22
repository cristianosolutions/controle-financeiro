import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

export async function requireAdmin(request: Request, _response: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({ where: { id: request.userId! }, select: { role: true, isActive: true } });
  if (!user?.isActive) throw new AppError("Usuário desativado", 403);
  if (user.role !== "ADMIN") throw new AppError("Acesso exclusivo para administradores", 403);
  next();
}
