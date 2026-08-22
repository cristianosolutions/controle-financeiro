import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";

export const categoriesRouter = Router();
const categorySchema = z.object({
  name: z.string().trim().min(1).max(50).refine((name) => {
    const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return !["cartao", "cartao de credito", "credito", "debito", "pix", "dinheiro", "boleto"].includes(normalized);
  }, "Use categorias de consumo, como Alimentação, Saúde ou Lazer"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
  type: z.enum(["INCOME", "EXPENSE"]).nullish().transform((value) => value ?? null),
});

categoriesRouter.get("/", async (request, response) => {
  const categories = await prisma.category.findMany({
    where: { userId: request.userId! },
    orderBy: { name: "asc" },
    include: { _count: { select: { transactions: true } } },
  });
  response.json(categories);
});

categoriesRouter.post("/", async (request, response) => {
  const data = categorySchema.parse(request.body);
  const category = await prisma.category.create({ data: { ...data, userId: request.userId! } });
  response.status(201).json(category);
});

categoriesRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = categorySchema.parse(request.body);
  const result = await prisma.category.updateMany({ where: { id, userId: request.userId! }, data });
  if (!result.count) throw new AppError("Categoria não encontrada", 404);
  response.json(await prisma.category.findUnique({ where: { id } }));
});

categoriesRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await prisma.category.deleteMany({ where: { id, userId: request.userId!, transactions: { none: {} } } });
  if (!result.count) throw new AppError("Categoria não encontrada ou possui transações", 409);
  response.status(204).send();
});
