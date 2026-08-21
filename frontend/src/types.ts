export type TransactionType = "INCOME" | "EXPENSE";

export interface User { id: string; name: string; email: string }
export interface Category { id: string; name: string; color: string; type: TransactionType | null; _count?: { transactions: number } }
export interface Transaction {
  id: string; description: string; amount: string; type: TransactionType; date: string;
  notes: string | null; categoryId: string; category: Category;
}
export interface Summary {
  month: string; income: number; expense: number; balance: number; transactionCount: number; recent: Transaction[];
}
