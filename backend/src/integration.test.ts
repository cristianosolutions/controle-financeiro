import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "./app.js";
import { prisma } from "./lib/prisma.js";

const suffix = randomUUID().slice(0, 8);
const emails = [`integration-${suffix}@example.test`, `isolation-${suffix}@example.test`];
const createdUserIds: string[] = [];
const password = "Integration#2026";

async function registerAndLogin(email: string, name: string) {
  const registration = await request(app).post("/api/auth/register").send({ name, email, password }).expect(201);
  createdUserIds.push(registration.body.id);
  const login = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return { token: login.body.token as string, userId: registration.body.id as string };
}

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (createdUserIds.length) await prisma.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: createdUserIds } }, { entityId: { in: createdUserIds } }] } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
});

describe.sequential("fluxo integrado da API", () => {
  it("autentica, cria dados financeiros, gera aviso e isola outro usuário", async () => {
    const first = await registerAndLogin(emails[0]!, "Usuário Integração");
    const authorization = { Authorization: `Bearer ${first.token}` };

    const accounts = await request(app).get("/api/accounts").set(authorization).expect(200);
    expect(accounts.body).toHaveLength(1);
    expect(accounts.body[0].name).toBe("Conta principal");

    const category = await request(app).post("/api/categories").set(authorization).send({ name: "Teste integrado", color: "#4f46e5", type: "EXPENSE" }).expect(201);
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const transaction = await request(app).post("/api/transactions").set(authorization).send({
      description: "Compromisso de integração", amount: 125.5, type: "EXPENSE", status: "PENDING",
      date: yesterday.toISOString(), categoryId: category.body.id, accountId: accounts.body[0].id,
      paymentMethod: "PIX", installments: 1,
    }).expect(201);
    expect(transaction.body.userId).toBe(first.userId);

    const alerts = await request(app).get("/api/alerts").set(authorization).expect(200);
    expect(alerts.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "OVERDUE_TRANSACTION", severity: "CRITICAL" })]));

    const month = yesterday.toISOString().slice(0, 7);
    const dashboard = await request(app).get(`/api/dashboard/summary?month=${month}`).set(authorization).expect(200);
    expect(dashboard.body.transactionCount).toBe(0);
    expect(dashboard.body.forecast.pendingCount).toBe(1);

    const second = await registerAndLogin(emails[1]!, "Usuário Isolado");
    const isolatedList = await request(app).get("/api/transactions").set({ Authorization: `Bearer ${second.token}` }).expect(200);
    expect(isolatedList.body.pagination.total).toBe(0);
  });
});
