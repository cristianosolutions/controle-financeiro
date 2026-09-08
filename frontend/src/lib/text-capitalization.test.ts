import { describe, expect, it } from "vitest";
import { capitalizeFirstLetter } from "./text-capitalization";

describe("capitalização dos preenchimentos", () => {
  it("coloca a primeira letra de cada palavra em maiúscula", () => {
    expect(capitalizeFirstLetter("aluguel mensal")).toBe("Aluguel Mensal");
    expect(capitalizeFirstLetter("internet móvel residencial")).toBe("Internet Móvel Residencial");
    expect(capitalizeFirstLetter("CALÇADO SOCIAL")).toBe("Calçado Social");
  });

  it("preserva espaços e caracteres antes da primeira letra", () => {
    expect(capitalizeFirstLetter("  2ª parcela")).toBe("  2ª Parcela");
    expect(capitalizeFirstLetter("  observação")).toBe("  Observação");
  });

  it("não altera texto sem letras nem o restante da informação", () => {
    expect(capitalizeFirstLetter("123,45")).toBe("123,45");
    expect(capitalizeFirstLetter("CONTA PRINCIPAL")).toBe("Conta Principal");
  });
});
