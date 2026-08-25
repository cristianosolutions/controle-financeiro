import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const auditLogsRouter = Router();
auditLogsRouter.get("/", async (request, response) => {
  const query = z.object({
    action: z.string().trim().max(100).optional(), actorUserId: z.string().uuid().optional(),
    from: z.coerce.date().optional(), to: z.coerce.date().optional(), page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(30),
  }).parse(request.query);
  const where = {
    ...(query.action && { action: query.action }), ...(query.actorUserId && { actorUserId: query.actorUserId }),
    ...((query.from || query.to) && { createdAt: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) } }),
  };
  const [items, total, actions] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { actor: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);
  response.json({ items, actions: actions.map((item) => item.action), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } });
});
