import { describe, expect, it } from "vitest";
import { goalProgress } from "./goal-progress.js";

describe("goal progress", () => {
  it("combines the initial value and contributions", () => {
    const result = goalProgress({ targetAmount: 1_000, initialAmount: 100, contributions: 300, deadline: null, status: "ACTIVE" });
    expect(result).toMatchObject({ savedAmount: 400, remainingAmount: 600, percentage: 40, monthlyNeeded: null, effectiveStatus: "ACTIVE" });
  });

  it("calculates the monthly effort until the deadline", () => {
    const result = goalProgress(
      { targetAmount: 1_200, initialAmount: 0, contributions: 300, deadline: new Date("2026-11-01T00:00:00.000Z"), status: "ACTIVE" },
      new Date("2026-08-01T00:00:00.000Z"),
    );
    expect(result.monthlyNeeded).toBe(300);
    expect(result.daysRemaining).toBe(92);
  });

  it("marks completed and overdue goals", () => {
    expect(goalProgress({ targetAmount: 500, initialAmount: 500, contributions: 0, deadline: null, status: "ACTIVE" }).effectiveStatus).toBe("COMPLETED");
    expect(goalProgress({ targetAmount: 500, initialAmount: 0, contributions: 100, deadline: new Date("2026-01-01T00:00:00.000Z"), status: "ACTIVE" }, new Date("2026-02-01T00:00:00.000Z")).isOverdue).toBe(true);
  });
});
