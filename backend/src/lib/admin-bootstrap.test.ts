import { describe, expect, it } from "vitest";
import { parseAdminPromotionArgs } from "./admin-bootstrap.js";

describe("bootstrap administrativo", () => {
  it("normaliza o e-mail e exige confirmação explícita", () => {
    expect(parseAdminPromotionArgs(["ADMIN@EXAMPLE.COM", "--confirm"])).toEqual({ email: "admin@example.com", confirmed: true });
  });

  it("rejeita e-mail inválido", () => {
    expect(() => parseAdminPromotionArgs(["invalido", "--confirm"])).toThrow();
  });
});
