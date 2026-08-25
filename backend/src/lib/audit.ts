import type { Request } from "express";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "./prisma.js";

export async function writeAudit(request: Request, entry: { action: string; entityType: string; entityId?: string | null; description: string; metadata?: Record<string, unknown> }) {
  await prisma.auditLog.create({ data: {
    action: entry.action, entityType: entry.entityType, entityId: entry.entityId ?? null, description: entry.description,
    ...(entry.metadata && { metadata: entry.metadata as Prisma.InputJsonValue }), actorUserId: request.userId ?? null,
    ipAddress: request.ip || null, userAgent: request.get("user-agent")?.slice(0, 500) ?? null,
  } });
}
