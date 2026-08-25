import { describe, expect, it } from "vitest";
import { budgetProgress } from "./budget-progress.js";

describe("progresso do orçamento", () => {
  it("mantém o orçamento saudável abaixo de 80%", () => {
    expect(budgetProgress(1000, 799).alert).toBe("OK");
  });

  it("alerta ao atingir 80%", () => {
    expect(budgetProgress(1000, 800).alert).toBe("WARNING");
  });

  it("marca como excedido ao atingir 100%", () => {
    const result = budgetProgress(1000, 1100, 100);
    expect(result.alert).toBe("EXCEEDED");
    expect(result.remaining).toBe(-100);
    expect(result.projectedPercentage).toBe(120);
  });
});
