import type { ErrorRequestHandler } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(422).json({ message: "Dados inválidos", issues: error.issues });
    return;
  }
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    response.status(409).json({ message: "Já existe um registro com esses dados" });
    return;
  }
  if (env.NODE_ENV !== "production") console.error(error);
  response.status(500).json({ message: "Erro interno do servidor" });
};
