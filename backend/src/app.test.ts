import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("API", () => {
  it("responde o health check", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
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

  it("rejeita payload inválido no cadastro", async () => {
    const response = await request(app).post("/api/auth/register").send({ name: "A", email: "inválido", password: "123" }).expect(422);
    expect(response.body.message).toBe("Dados inválidos");
  });
});
