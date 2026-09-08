import { describe, expect, it } from "vitest";
import { formatCurrencyInput, parseCurrencyInput } from "./currency-input";

describe("campo monetário", () => {
  it("formata valores com duas casas decimais", () => {
    expect(formatCurrencyInput("500")).toBe("500,00");
    expect(formatCurrencyInput("530.5")).toBe("530,50");
  });

  it("converte valores brasileiros para número", () => {
    expect(parseCurrencyInput("500,00")).toBe(500);
    expect(parseCurrencyInput("1.250,75")).toBe(1250.75);
  });
});
