import { describe, expect, it } from "vitest";
import { readAlertPreference, writeAlertPreference } from "./alert-preferences";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("preferências dos avisos", () => {
  it("isola e remove duplicidades por usuário", () => {
    const storage = memoryStorage();
    writeAlertPreference(storage, "user-a", "read", ["one", "one", "two"]);
    expect(readAlertPreference(storage, "user-a", "read")).toEqual(["one", "two"]);
    expect(readAlertPreference(storage, "user-b", "read")).toEqual([]);
  });

  it("ignora conteúdo inválido sem interromper a aplicação", () => {
    const storage = { getItem: () => "{invalid" };
    expect(readAlertPreference(storage, "user", "dismissed")).toEqual([]);
  });
});
