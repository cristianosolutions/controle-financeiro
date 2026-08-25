import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export function auditTrail(request: Request, response: Response, next: NextFunction) {
  response.on("finish", () => {
    if (!request.userId || !["POST", "PUT", "PATCH", "DELETE"].includes(request.method) || response.statusCode >= 400) return;
    if (request.path.startsWith("/api/auth") || request.path.startsWith("/api/admin/users")) return;
    const parts = request.path.split("/").filter(Boolean);
    const entityType = parts[1] ?? "system";
    const entityId = parts.find((part) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(part)) ?? null;
    void prisma.auditLog.create({ data: {
      action: `${entityType.toUpperCase()}_${request.method}`,
      entityType, entityId, description: `${request.method} ${request.path}`,
      metadata: { statusCode: response.statusCode }, actorUserId: request.userId,
      ipAddress: request.ip || null, userAgent: request.get("user-agent")?.slice(0, 500) ?? null,
    } }).catch(() => undefined);
  });
  next();
}
