import "dotenv/config";
import { z } from "zod";

const developmentSecret = "development-only-secret-change-me-123456";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32).default(developmentSecret),
  PORT: z.coerce.number().int().positive().default(3333),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
}).superRefine((data, context) => {
  if (data.NODE_ENV === "production" && data.JWT_SECRET === developmentSecret) {
    context.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "JWT_SECRET deve ser definido em produção" });
  }
});

export const env = envSchema.parse(process.env);
