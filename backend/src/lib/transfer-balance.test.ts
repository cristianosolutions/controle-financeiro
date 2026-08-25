import { describe, expect, it } from "vitest";
import { transferEffect } from "./transfer-balance.js";

describe("transfer balance", () => {
  const transfers = [
    { fromAccountId: "a", toAccountId: "b", amount: 100, status: "COMPLETED" as const },
    { fromAccountId: "b", toAccountId: "a", amount: 25, status: "COMPLETED" as const },
    { fromAccountId: "a", toAccountId: "b", amount: 500, status: "PENDING" as const },
  ];
  it("subtracts outgoing and adds incoming completed transfers", () => {
    expect(transferEffect("a", transfers)).toBe(-75);
    expect(transferEffect("b", transfers)).toBe(75);
  });
  it("does not change total wealth", () => {
    expect(transferEffect("a", transfers) + transferEffect("b", transfers)).toBe(0);
  });
});
