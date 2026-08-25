import { createHash } from "node:crypto";

export function parseImportDate(value: string) {
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : brazilian ? [Number(brazilian[3]), Number(brazilian[2]), Number(brazilian[1])] : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day ? date : null;
}

export function parseImportAmount(value: string) {
  const text = value.trim().replace(/R\$\s*/i, "").replace(/\s/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export const normalizeImportText = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function importType(value: string) {
  const normalized = normalizeImportText(value);
  return normalized === "receita" || normalized === "income" ? "INCOME" as const : normalized === "despesa" || normalized === "expense" ? "EXPENSE" as const : null;
}
export function importStatus(value: string, type: "INCOME" | "EXPENSE") {
  const statuses: Record<string, "PENDING" | "PAID" | "RECEIVED" | "CANCELED"> = { previsto: "PENDING", pendente: "PENDING", pending: "PENDING", pago: "PAID", paid: "PAID", recebido: "RECEIVED", received: "RECEIVED", cancelado: "CANCELED", canceled: "CANCELED" };
  return value.trim() ? statuses[normalizeImportText(value)] ?? null : type === "INCOME" ? "RECEIVED" : "PAID";
}
export function importPaymentMethod(value: string) {
  const methods: Record<string, "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD" | "BANK_TRANSFER" | "BOLETO" | "OTHER"> = {
    dinheiro: "CASH", cash: "CASH", pix: "PIX", "cartao de debito": "DEBIT_CARD", debit_card: "DEBIT_CARD",
    "cartao de credito": "CREDIT_CARD", credit_card: "CREDIT_CARD", "transferencia bancaria": "BANK_TRANSFER",
    bank_transfer: "BANK_TRANSFER", boleto: "BOLETO", outra: "OTHER", outro: "OTHER", other: "OTHER",
  };
  return value.trim() ? methods[normalizeImportText(value)] ?? null : null;
}
export function importFingerprint(data: { date: Date; description: string; amount: number; type: string; categoryId: string; accountId: string | null; cardId: string | null }) {
  return createHash("sha256").update([data.date.toISOString().slice(0, 10), normalizeImportText(data.description), data.amount.toFixed(2), data.type, data.categoryId, data.accountId ?? "", data.cardId ?? ""].join("|")).digest("hex");
}
