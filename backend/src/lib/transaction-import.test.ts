import { describe, expect, it } from "vitest";
import { importFingerprint, importPaymentMethod, importStatus, importType, parseImportAmount, parseImportDate } from "./transaction-import.js";

describe("transaction import", () => {
  it("reads Brazilian and ISO dates safely", () => {
    expect(parseImportDate("25/08/2026")?.toISOString().slice(0, 10)).toBe("2026-08-25");
    expect(parseImportDate("2026-08-25")?.toISOString().slice(0, 10)).toBe("2026-08-25");
    expect(parseImportDate("31/02/2026")).toBeNull();
  });
  it("reads Brazilian monetary values", () => {
    expect(parseImportAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseImportAmount("-10,00")).toBeNull();
  });
  it("maps localized labels", () => {
    expect(importType("Receita")).toBe("INCOME");
    expect(importStatus("", "EXPENSE")).toBe("PAID");
    expect(importPaymentMethod("Cartão de crédito")).toBe("CREDIT_CARD");
  });
  it("generates a stable normalized fingerprint", () => {
    const base = { date: new Date("2026-08-25T00:00:00Z"), description: "Mercado", amount: 10, type: "EXPENSE", categoryId: "cat", accountId: "acc", cardId: null };
    expect(importFingerprint(base)).toBe(importFingerprint({ ...base, description: "  MERCADO " }));
  });
});
