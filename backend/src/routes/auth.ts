import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rate-limit.js";

export const authRouter = Router();
const credentialsSchema = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(8).max(72) });

authRouter.post("/register", authRateLimit, async (request, response) => {
  const data = credentialsSchema.extend({ name: z.string().trim().min(2).max(100) }).parse(request.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  response.status(201).json(user);
});

authRouter.post("/login", authRateLimit, async (request, response) => {
  const data = credentialsSchema.parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) throw new AppError("E-mail ou senha inválidos", 401);
  if (!user.isActive) throw new AppError("Usuário desativado. Procure um administrador", 403);
  const token = jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: "7d" });
  response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
});

authRouter.get("/me", authenticate, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.userId! },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  if (!user) throw new AppError("Usuário não encontrado", 404);
  response.json(user);
});
