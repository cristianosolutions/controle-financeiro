import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { routes } from "./routes/index.js";
import { auditTrail } from "./middleware/audit-trail.js";
import { prisma } from "./lib/prisma.js";
import { ensureAttachmentStorage } from "./lib/attachments.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(auditTrail);
app.get("/health", (_request, response) => response.json({ status: "ok" }));
app.get("/health/live", (_request, response) => response.json({ status: "alive", uptime: Math.floor(process.uptime()) }));
app.get("/health/ready", async (_request, response) => {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, ensureAttachmentStorage()]);
    response.json({ status: "ready", checks: { database: "ok", storage: "ok" } });
  } catch {
    response.status(503).json({ status: "unavailable", checks: { database: "error", storage: "error" } });
  }
});
app.use("/api", routes);
app.use((_request, response) => response.status(404).json({ message: "Rota não encontrada" }));
app.use(errorHandler);
