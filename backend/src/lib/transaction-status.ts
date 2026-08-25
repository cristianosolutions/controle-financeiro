export type StoredTransactionStatus = "PENDING" | "PAID" | "RECEIVED" | "CANCELED";
export type EffectiveTransactionStatus = StoredTransactionStatus | "OVERDUE";

export function defaultTransactionStatus(type: "INCOME" | "EXPENSE"): StoredTransactionStatus {
  return type === "INCOME" ? "RECEIVED" : "PAID";
}

export function validateTransactionStatus(type: "INCOME" | "EXPENSE", status?: StoredTransactionStatus): StoredTransactionStatus {
  const resolved = status ?? defaultTransactionStatus(type);
  if (type === "INCOME" && resolved === "PAID") throw new Error("Receitas devem ser marcadas como recebidas");
  if (type === "EXPENSE" && resolved === "RECEIVED") throw new Error("Despesas devem ser marcadas como pagas");
  return resolved;
}

export function effectiveTransactionStatus(status: StoredTransactionStatus, date: Date, reference = new Date()): EffectiveTransactionStatus {
  if (status !== "PENDING") return status;
  const today = Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate());
  return date.getTime() < today ? "OVERDUE" : "PENDING";
}
