import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

export function authenticate(request: Request, _response: Response, next: NextFunction) {
  const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) throw new AppError("Token de acesso ausente", 401);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string") throw new Error("invalid payload");
    request.userId = payload.sub;
    next();
  } catch {
    throw new AppError("Token de acesso inválido ou expirado", 401);
  }
}
