import { describe, expect, it } from "vitest";
import { accentSuggestions } from "./writing-suggestions";

describe("sugestões de acentuação", () => {
  it("sugere a grafia acentuada", () => {
    expect(accentSuggestions("Agua")).toContain("Água");
    expect(accentSuggestions("Saude")).toContain("Saúde");
  });

  it("não interfere em nomes próprios desconhecidos ou palavras já acentuadas", () => {
    expect(accentSuggestions("Cagece")).toEqual([]);
    expect(accentSuggestions("Saúde")).toEqual([]);
  });
});
