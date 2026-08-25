export type BudgetAlert = "OK" | "WARNING" | "EXCEEDED";

export function budgetProgress(limit: number, spent: number, pending = 0) {
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const projectedPercentage = limit > 0 ? ((spent + pending) / limit) * 100 : 0;
  const alert: BudgetAlert = percentage >= 100 ? "EXCEEDED" : percentage >= 80 ? "WARNING" : "OK";
  return {
    spent,
    pending,
    remaining: limit - spent,
    percentage,
    projectedPercentage,
    alert,
  };
}
