import { describe, expect, it } from "vitest";
import { buildFinancialAlerts } from "./financial-alerts.js";

const today = new Date("2026-08-25T12:00:00.000Z");

describe("avisos financeiros", () => {
  it("classifica lançamentos vencidos e próximos", () => {
    const alerts = buildFinancialAlerts({
      today,
      pendingTransactions: [
        { id: "late", description: "Conta de luz", amount: 100, date: new Date("2026-08-23T00:00:00Z") },
        { id: "soon", description: "Internet", amount: 80, date: new Date("2026-08-28T00:00:00Z") },
        { id: "later", description: "Aluguel", amount: 900, date: new Date("2026-09-10T00:00:00Z") },
      ], budgets: [], invoices: [], goals: [],
    });
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toMatchObject({ kind: "OVERDUE_TRANSACTION", severity: "CRITICAL" });
    expect(alerts[1]).toMatchObject({ kind: "UPCOMING_TRANSACTION", severity: "INFO" });
  });

  it("avisa orçamento a partir de 80% e prioriza o excedido", () => {
    const alerts = buildFinancialAlerts({ today, pendingTransactions: [], invoices: [], goals: [], budgets: [
      { id: "one", categoryName: "Lazer", amount: 100, spent: 79 },
      { id: "two", categoryName: "Saúde", amount: 100, spent: 80 },
      { id: "three", categoryName: "Alimentação", amount: 100, spent: 120 },
    ] });
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toMatchObject({ id: "budget:three:120", severity: "CRITICAL" });
    expect(alerts[1]).toMatchObject({ id: "budget:two:80", severity: "WARNING" });
  });

  it("avisa faturas e metas dentro da janela definida", () => {
    const alerts = buildFinancialAlerts({ today, pendingTransactions: [], budgets: [], invoices: [
      { cardId: "card", cardName: "Nubank", referenceMonth: "2026-08", total: 350, dueDate: new Date("2026-08-26T00:00:00Z") },
    ], goals: [
      { id: "goal", name: "Reserva", deadline: new Date("2026-09-20T00:00:00Z"), currentAmount: 250, targetAmount: 1000 },
    ] });
    expect(alerts.map((item) => item.kind)).toEqual(["CARD_INVOICE", "GOAL"]);
    expect(alerts[0]!.severity).toBe("CRITICAL");
  });
});
