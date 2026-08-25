import { describe, expect, it } from "vitest";
import { generateResetToken, hashResetToken, sessionDescription, strongPasswordSchema } from "./security.js";

describe("security helpers", () => {
  it("requires a stronger password", () => {
    expect(strongPasswordSchema.safeParse("Senha123").success).toBe(true);
    expect(strongPasswordSchema.safeParse("senha123").success).toBe(false);
    expect(strongPasswordSchema.safeParse("SENHASEMNUMERO").success).toBe(false);
  });
  it("hashes recovery tokens without storing the original", () => {
    const token = generateResetToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hashResetToken(token)).toHaveLength(64);
    expect(hashResetToken(token)).not.toContain(token);
  });
  it("describes common devices", () => {
    expect(sessionDescription("Mozilla Chrome/100 Windows")).toBe("Google Chrome em Windows");
    expect(sessionDescription(null)).toBe("Dispositivo não identificado");
  });
});
