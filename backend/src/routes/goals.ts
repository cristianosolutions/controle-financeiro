import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { goalProgress } from "../lib/goal-progress.js";
import { prisma } from "../lib/prisma.js";

export const goalsRouter = Router();
const nullableText = z.string().trim().max(500).nullish().transform((value) => value || null);
const goalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  targetAmount: z.coerce.number().positive().max(999999999999.99),
  initialAmount: z.coerce.number().min(0).max(999999999999.99).default(0),
  deadline: z.coerce.date().nullish().transform((value) => value ?? null),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4f46e5"),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELED"]).default("ACTIVE"),
  notes: nullableText,
});
const contributionSchema = z.object({
  amount: z.coerce.number().positive().max(999999999999.99),
  date: z.coerce.date(),
  accountId: z.string().uuid().nullish().transform((value) => value || null),
  notes: nullableText,
});

async function goalResponse(userId: string, id?: string) {
  const goals = await prisma.financialGoal.findMany({
    where: { userId, ...(id && { id }) },
    include: { contributions: { include: { account: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] } },
    orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
  });
  return goals.map((goal) => {
    const contributions = goal.contributions.reduce((sum, contribution) => sum + contribution.amount.toNumber(), 0);
    return { ...goal, ...goalProgress({ targetAmount: goal.targetAmount.toNumber(), initialAmount: goal.initialAmount.toNumber(), contributions, deadline: goal.deadline, status: goal.status }) };
  });
}

goalsRouter.get("/", async (request, response) => {
  response.json(await goalResponse(request.userId!));
});

goalsRouter.post("/", async (request, response) => {
  const data = goalSchema.parse(request.body);
  const goal = await prisma.financialGoal.create({ data: { ...data, userId: request.userId! } });
  response.status(201).json((await goalResponse(request.userId!, goal.id))[0]);
});

goalsRouter.put("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = goalSchema.parse(request.body);
  const result = await prisma.financialGoal.updateMany({ where: { id, userId: request.userId! }, data });
  if (!result.count) throw new AppError("Meta não encontrada", 404);
  response.json((await goalResponse(request.userId!, id))[0]);
});

goalsRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await prisma.financialGoal.deleteMany({ where: { id, userId: request.userId! } });
  if (!result.count) throw new AppError("Meta não encontrada", 404);
  response.status(204).send();
});

goalsRouter.post("/:id/contributions", async (request, response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const data = contributionSchema.parse(request.body);
  const goal = await prisma.financialGoal.findFirst({ where: { id, userId: request.userId! } });
  if (!goal) throw new AppError("Meta não encontrada", 404);
  if (goal.status === "CANCELED") throw new AppError("Reative a meta antes de registrar um aporte", 422);
  if (data.accountId) {
    const account = await prisma.account.findFirst({ where: { id: data.accountId, userId: request.userId!, isActive: true } });
    if (!account) throw new AppError("Conta não encontrada ou inativa", 404);
  }
  await prisma.goalContribution.create({ data: { ...data, goalId: id, userId: request.userId! } });
  response.status(201).json((await goalResponse(request.userId!, id))[0]);
});

goalsRouter.delete("/:id/contributions/:contributionId", async (request, response) => {
  const { id, contributionId } = z.object({ id: z.string().uuid(), contributionId: z.string().uuid() }).parse(request.params);
  const result = await prisma.goalContribution.deleteMany({ where: { id: contributionId, goalId: id, userId: request.userId! } });
  if (!result.count) throw new AppError("Aporte não encontrado", 404);
  response.status(204).send();
});
