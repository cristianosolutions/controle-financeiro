import { describe, expect, it } from "vitest";
import { addMonth, buildFinancialForecast } from "./financial-forecast.js";

describe("financial forecast", () => {
  it("advances months across years", () => {
    expect(addMonth("2026-12", 1)).toBe("2027-01");
    expect(addMonth("2026-01", -1)).toBe("2025-12");
  });

  it("combines direct expenses and card invoices without losing their breakdown", () => {
    const result = buildFinancialForecast(1_000, "2026-08", 2, [
      { month: "2026-08", type: "INCOME", amount: 500 },
      { month: "2026-08", type: "EXPENSE", amount: 200 },
      { month: "2026-08", type: "CARD_INVOICE", amount: 100 },
      { month: "2026-09", type: "EXPENSE", amount: 150 },
    ]);
    expect(result.months[0]).toMatchObject({ income: 500, expense: 300, cardInvoices: 100, net: 200, cumulativeBalance: 1_200 });
    expect(result.finalBalance).toBe(1_050);
    expect(result.totalExpense).toBe(450);
  });

  it("identifies the lowest projected balance", () => {
    const result = buildFinancialForecast(100, "2026-08", 2, [
      { month: "2026-08", type: "EXPENSE", amount: 250 },
      { month: "2026-09", type: "INCOME", amount: 80 },
    ]);
    expect(result.lowestBalance).toBe(-150);
    expect(result.months[1]?.cumulativeBalance).toBe(-70);
  });
});
