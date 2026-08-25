import { describe, expect, it } from "vitest";
import { invoiceDueDate, invoiceReferenceMonth } from "./billing-cycle.js";

describe("ciclo de fatura", () => {
  it("mantém a compra antes do fechamento na fatura esperada", () => {
    expect(invoiceReferenceMonth(new Date("2026-08-08T00:00:00Z"), 10, 17)).toBe("2026-08");
  });

  it("move a compra após o fechamento para o mês seguinte", () => {
    expect(invoiceReferenceMonth(new Date("2026-08-11T00:00:00Z"), 10, 17)).toBe("2026-09");
  });

  it("considera vencimento no mês seguinte quando o dia é anterior ao fechamento", () => {
    expect(invoiceReferenceMonth(new Date("2026-08-20T00:00:00Z"), 25, 5)).toBe("2026-09");
  });

  it("ajusta vencimento para o último dia do mês", () => {
    expect(invoiceDueDate("2026-02", 31).toISOString().slice(0, 10)).toBe("2026-02-28");
  });
});
