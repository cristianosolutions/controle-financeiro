import { describe, expect, it } from "vitest";
import { percentageChange, reportAnalytics } from "./report-analytics.js";

describe("report analytics", () => {
  const items = [
    { amount: 100, type: "INCOME" as const, date: new Date("2026-08-01T00:00:00Z"), account: { id: "a", name: "Conta", color: "#000000" }, card: null, paymentMethod: "PIX" },
    { amount: 30, type: "EXPENSE" as const, date: new Date("2026-08-02T00:00:00Z"), account: { id: "a", name: "Conta", color: "#000000" }, card: null, paymentMethod: "PIX" },
    { amount: 40, type: "EXPENSE" as const, date: new Date("2026-09-02T00:00:00Z"), account: null, card: { id: "c", name: "Cartão", color: "#ffffff" }, paymentMethod: "CREDIT_CARD" },
  ];
  it("groups values by month and source", () => {
    const result = reportAnalytics(items);
    expect(result.monthly).toEqual([
      { month: "2026-08", income: 100, expense: 30, balance: 70, count: 2 },
      { month: "2026-09", income: 0, expense: 40, balance: -40, count: 1 },
    ]);
    expect(result.accounts[0]).toMatchObject({ id: "a", total: 130, count: 2 });
    expect(result.cards[0]).toMatchObject({ id: "c", total: 40, count: 1 });
  });
  it("calculates percentage changes safely", () => {
    expect(percentageChange(120, 100)).toBe(20);
    expect(percentageChange(10, 0)).toBe(100);
    expect(percentageChange(0, 0)).toBe(0);
  });
});
