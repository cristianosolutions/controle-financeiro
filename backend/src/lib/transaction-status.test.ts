import { describe, expect, it } from "vitest";
import { defaultTransactionStatus, effectiveTransactionStatus, validateTransactionStatus } from "./transaction-status.js";

describe("status de lançamentos", () => {
  it("define o status realizado conforme o tipo", () => {
    expect(defaultTransactionStatus("INCOME")).toBe("RECEIVED");
    expect(defaultTransactionStatus("EXPENSE")).toBe("PAID");
  });

  it("identifica automaticamente lançamentos pendentes vencidos", () => {
    expect(effectiveTransactionStatus("PENDING", new Date("2026-08-20T00:00:00Z"), new Date("2026-08-25T12:00:00Z"))).toBe("OVERDUE");
  });

  it("mantém compromissos futuros como pendentes", () => {
    expect(effectiveTransactionStatus("PENDING", new Date("2026-08-30T00:00:00Z"), new Date("2026-08-25T12:00:00Z"))).toBe("PENDING");
  });

  it("rejeita status incompatível com o tipo", () => {
    expect(() => validateTransactionStatus("INCOME", "PAID")).toThrow();
    expect(() => validateTransactionStatus("EXPENSE", "RECEIVED")).toThrow();
  });
});
