import { Router } from "express";
import { z } from "zod";
import { importFingerprint, importPaymentMethod, importStatus, importType, normalizeImportText, parseImportAmount, parseImportDate } from "../lib/transaction-import.js";
import { prisma } from "../lib/prisma.js";

export const importsRouter = Router();
const rawRowSchema = z.object({
  rowNumber: z.coerce.number().int().positive(), date: z.string().max(30), description: z.string().max(200), amount: z.string().max(50),
  type: z.string().max(30), category: z.string().max(100), account: z.string().max(100).default(""), paymentMethod: z.string().max(60).default(""),
  card: z.string().max(100).default(""), status: z.string().max(40).default(""), notes: z.string().max(500).default(""),
});
const requestSchema = z.object({ rows: z.array(rawRowSchema).min(1).max(2_000), fileName: z.string().trim().min(1).max(255).default("importacao.csv") });

async function analyze(userId: string, input: z.infer<typeof requestSchema>) {
  const [categories, accounts, cards] = await Promise.all([
    prisma.category.findMany({ where: { userId } }), prisma.account.findMany({ where: { userId, isActive: true } }), prisma.creditCard.findMany({ where: { userId, isActive: true } }),
  ]);
  const analyzed = input.rows.map((raw) => {
    const errors: string[] = [], warnings: string[] = [];
    const date = parseImportDate(raw.date); if (!date) errors.push("Data inválida");
    const amount = parseImportAmount(raw.amount); if (!amount) errors.push("Valor inválido");
    const type = importType(raw.type); if (!type) errors.push("Tipo deve ser Receita ou Despesa");
    const description = raw.description.trim(); if (!description || description.length > 120) errors.push("Descrição deve ter entre 1 e 120 caracteres");
    const category = categories.find((item) => normalizeImportText(item.name) === normalizeImportText(raw.category));
    if (!category) errors.push(`Categoria “${raw.category || "não informada"}” não encontrada`);
    else if (type && category.type && category.type !== type) errors.push("Categoria incompatível com o tipo");
    const paymentMethod = importPaymentMethod(raw.paymentMethod);
    if (raw.paymentMethod.trim() && !paymentMethod) errors.push("Forma de pagamento inválida");
    if (type === "EXPENSE" && !paymentMethod) errors.push("Forma de pagamento obrigatória para despesas");
    const account = raw.account.trim() ? accounts.find((item) => normalizeImportText(item.name) === normalizeImportText(raw.account)) : null;
    const card = raw.card.trim() ? cards.find((item) => normalizeImportText(item.name) === normalizeImportText(raw.card)) : null;
    if (raw.account.trim() && !account) errors.push(`Conta “${raw.account}” não encontrada ou inativa`);
    if (raw.card.trim() && !card) errors.push(`Cartão “${raw.card}” não encontrado ou inativo`);
    if (paymentMethod === "CREDIT_CARD" && !card) errors.push("Informe um cartão cadastrado");
    if (paymentMethod !== "CREDIT_CARD" && !account) errors.push("Informe uma conta cadastrada");
    const status = type ? importStatus(raw.status, type) : null;
    if (!status) errors.push("Situação inválida");
    if (type === "INCOME" && status === "PAID") errors.push("Receitas não podem ter situação Pago");
    if (type === "EXPENSE" && status === "RECEIVED") errors.push("Despesas não podem ter situação Recebido");
    if (!raw.notes.trim()) warnings.push("Sem observação");
    const normalized = date && amount && type && category && status && errors.length === 0 ? {
      description, amount, type, status, date, notes: raw.notes.trim() || null, paymentMethod,
      categoryId: category.id, accountId: paymentMethod === "CREDIT_CARD" ? null : account?.id ?? null,
      cardId: paymentMethod === "CREDIT_CARD" ? card?.id ?? null : null,
    } : null;
    return { raw, errors, warnings, normalized, fingerprint: normalized ? importFingerprint(normalized) : null, duplicate: false };
  });
  const fingerprints = analyzed.flatMap((row) => row.fingerprint ? [row.fingerprint] : []);
  const validDates = [...new Set(analyzed.flatMap((row) => row.normalized ? [row.normalized.date.toISOString()] : []))].map((date) => new Date(date));
  const existingTransactions = await prisma.transaction.findMany({
    where: { userId, OR: [{ importFingerprint: { in: fingerprints } }, ...(validDates.length ? [{ date: { in: validDates } }] : [])] },
    select: { importFingerprint: true, date: true, description: true, amount: true, type: true, categoryId: true, accountId: true, cardId: true },
  });
  const existing = new Set(existingTransactions.flatMap((item) => [
    ...(item.importFingerprint ? [item.importFingerprint] : []),
    importFingerprint({ ...item, amount: item.amount.toNumber() }),
  ]));
  const seen = new Set<string>();
  for (const row of analyzed) {
    if (!row.fingerprint) continue;
    row.duplicate = existing.has(row.fingerprint) || seen.has(row.fingerprint);
    if (row.duplicate) row.warnings.push("Possível duplicidade — esta linha não será importada");
    seen.add(row.fingerprint);
  }
  return analyzed;
}

importsRouter.post("/transactions/preview", async (request, response) => {
  const input = requestSchema.parse(request.body);
  const rows = await analyze(request.userId!, input);
  response.json({ rows: rows.map(({ normalized, fingerprint, ...row }) => ({ ...row, normalized: normalized ? { ...normalized, date: normalized.date.toISOString() } : null })), summary: { total: rows.length, valid: rows.filter((row) => row.normalized && !row.duplicate).length, invalid: rows.filter((row) => row.errors.length > 0).length, duplicates: rows.filter((row) => row.duplicate).length } });
});

importsRouter.post("/transactions/commit", async (request, response) => {
  const input = requestSchema.parse(request.body);
  const rows = await analyze(request.userId!, input);
  const valid = rows.filter((row) => row.normalized && !row.duplicate);
  const result = await prisma.transaction.createMany({ data: valid.map((row) => ({ ...row.normalized!, userId: request.userId!, importFingerprint: row.fingerprint!, importSource: input.fileName })), skipDuplicates: true });
  response.status(201).json({ imported: result.count, skipped: input.rows.length - result.count, total: input.rows.length });
});
