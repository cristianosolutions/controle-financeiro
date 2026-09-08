import { describe, expect, it } from "vitest";
import { sortByLabel } from "./sorting";

describe("ordenação alfabética", () => {
  it("ordena conforme o português brasileiro", () => {
    const items = [{ name: "Saúde" }, { name: "Água" }, { name: "Alimentação" }];
    expect(sortByLabel(items, (item) => item.name).map((item) => item.name)).toEqual(["Água", "Alimentação", "Saúde"]);
  });

  it("não altera a coleção original", () => {
    const items = ["Z", "A"];
    sortByLabel(items, (item) => item);
    expect(items).toEqual(["Z", "A"]);
  });
});
