import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("API", () => {
  it("responde o health check", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("expõe o sinal de processo ativo", async () => {
    const response = await request(app).get("/health/live").expect(200);
    expect(response.body.status).toBe("alive");
    expect(response.body.uptime).toBeTypeOf("number");
  });

  it("aplica headers de segurança", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("retorna 404 para uma rota inexistente", async () => {
    const response = await request(app).get("/inexistente").expect(404);
    expect(response.body).toEqual({ message: "Rota não encontrada" });
  });

  it("bloqueia uma rota protegida sem token", async () => {
    const response = await request(app).get("/api/categories").expect(401);
    expect(response.body).toEqual({ message: "Token de acesso ausente" });
  });

  it("protege a gestão de contas sem token", async () => {
    const response = await request(app).get("/api/accounts").expect(401);
    expect(response.body).toEqual({ message: "Token de acesso ausente" });
  });

  it("protege a previsão financeira sem token", async () => {
    const response = await request(app).get("/api/forecasts").expect(401);
    expect(response.body).toEqual({ message: "Token de acesso ausente" });
  });

  it("protege as metas financeiras sem token", async () => {
    const response = await request(app).get("/api/goals").expect(401);
    expect(response.body).toEqual({ message: "Token de acesso ausente" });
  });

  it("protege a importação de lançamentos sem token", async () => {
    const response = await request(app).post("/api/imports/transactions/preview").expect(401);
    expect(response.body).toEqual({ message: "Token de acesso ausente" });
  });

  it("protege sessões e auditoria sem token", async () => {
    await request(app).get("/api/auth/sessions").expect(401);
    await request(app).get("/api/admin/audit-logs").expect(401);
  });

  it("protege transferências sem token", async () => {
    await request(app).get("/api/transfers").expect(401);
  });

  it("protege anexos de lançamentos sem token", async () => {
    await request(app).post("/api/transactions/00000000-0000-4000-8000-000000000000/attachments").expect(401);
  });

  it("protege a foto de perfil sem token", async () => {
    await request(app).get("/api/auth/avatar").expect(401);
    await request(app).put("/api/auth/avatar").expect(401);
    await request(app).delete("/api/auth/avatar").expect(401);
  });

  it("protege os avisos financeiros sem token", async () => {
    await request(app).get("/api/alerts").expect(401);
  });

  it("rejeita payload inválido no cadastro", async () => {
    const response = await request(app).post("/api/auth/register").send({ name: "A", email: "inválido", password: "123" }).expect(422);
    expect(response.body.message).toBe("Dados inválidos");
  });
});
