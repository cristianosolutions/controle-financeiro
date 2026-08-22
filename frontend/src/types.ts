export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentMethod = "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD" | "BANK_TRANSFER" | "BOLETO" | "OTHER";
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro", PIX: "Pix", DEBIT_CARD: "Cartão de débito", CREDIT_CARD: "Cartão de crédito",
  BANK_TRANSFER: "Transferência bancária", BOLETO: "Boleto", OTHER: "Outra",
};

export interface User { id: string; name: string; email: string }
export interface Category { id: string; name: string; color: string; type: TransactionType | null; _count?: { transactions: number } }
export interface Transaction {
  id: string; description: string; amount: string; type: TransactionType; date: string;
  notes: string | null; paymentMethod?: PaymentMethod | null; cardName?: string | null; categoryId: string; category: Category;
  installmentGroupId?: string | null; installmentNumber?: number | null; installmentTotal?: number | null;
}
export interface Summary {
  month: string; income: number; expense: number; balance: number; transactionCount: number; recent: Transaction[];
}
export interface FinancialReport {
  period: { from: string; to: string };
  totals: { income: number; expense: number; balance: number; count: number };
  categories: Array<{ id: string; name: string; color: string; type: TransactionType; total: number; count: number }>;
  items: Transaction[];
}
