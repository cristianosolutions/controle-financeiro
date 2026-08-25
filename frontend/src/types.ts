export type TransactionType = "INCOME" | "EXPENSE";
export type StoredTransactionStatus = "PENDING" | "PAID" | "RECEIVED" | "CANCELED";
export type TransactionStatus = StoredTransactionStatus | "OVERDUE";
export const transactionStatusLabels: Record<TransactionStatus, string> = {
  PENDING: "Previsto",
  PAID: "Pago",
  RECEIVED: "Recebido",
  OVERDUE: "Atrasado",
  CANCELED: "Cancelado",
};
export type AccountType = "CHECKING" | "SAVINGS" | "CASH" | "INVESTMENT" | "OTHER";
export type RecurrenceFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
export const recurrenceFrequencyLabels: Record<RecurrenceFrequency, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
  CUSTOM: "Personalizada",
};
export const accountTypeLabels: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CASH: "Dinheiro",
  INVESTMENT: "Investimentos",
  OTHER: "Outra conta",
};
export type PaymentMethod =
  | "CASH"
  | "PIX"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "BANK_TRANSFER"
  | "BOLETO"
  | "OTHER";
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  DEBIT_CARD: "Cartão de débito",
  CREDIT_CARD: "Cartão de crédito",
  BANK_TRANSFER: "Transferência bancária",
  BOLETO: "Boleto",
  OTHER: "Outra",
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
}
export interface AdminUser extends User {
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
}
export interface Category {
  id: string;
  name: string;
  color: string;
  type: TransactionType | null;
  _count?: { transactions: number };
}
export interface AuthSession {
  id: string;
  description: string;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  initialBalance: string;
  balance: number;
  isActive: boolean;
}
export interface CreditCard {
  id: string;
  name: string;
  brand: string | null;
  creditLimit: string;
  closingDay: number;
  dueDay: number;
  color: string;
  isActive: boolean;
  usedLimit: number;
  availableLimit: number;
}
export interface CardInvoicePayment {
  id: string;
  referenceMonth: string;
  amount: string;
  paidAt: string;
  account: Account;
}
export interface CardInvoice {
  referenceMonth: string;
  dueDate: string;
  total: number;
  items: Transaction[];
  payment: CardInvoicePayment | null;
}
export interface CardInvoicesResponse {
  card: CreditCard;
  invoices: CardInvoice[];
}
export interface RecurringTransaction {
  id: string;
  description: string;
  amount: string;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  intervalDays: number | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  isActive: boolean;
  categoryId: string;
  category: Category;
  accountId: string | null;
  account: Account | null;
  cardId: string | null;
  card: CreditCard | null;
  _count?: { transactions: number };
}
export interface Budget {
  id: string;
  month: string;
  amount: string;
  categoryId: string;
  category: Category;
  spent: number;
  pending: number;
  remaining: number;
  percentage: number;
  projectedPercentage: number;
  alert: "OK" | "WARNING" | "EXCEEDED";
}
export interface FinancialForecast {
  generatedAt: string;
  startMonth: string;
  monthsCount: number;
  openingBalance: number;
  finalBalance: number;
  lowestBalance: number;
  totalIncome: number;
  totalExpense: number;
  months: Array<{
    month: string;
    income: number;
    expense: number;
    cardInvoices: number;
    net: number;
    cumulativeBalance: number;
    pendingCount: number;
    invoiceCount: number;
  }>;
  alerts: Array<{ type: "NEGATIVE_BALANCE"; month: string; amount: number }>;
}
export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELED";
export type TransferStatus = "PENDING" | "COMPLETED" | "CANCELED";
export interface Transfer {
  id: string;
  description: string;
  amount: string;
  date: string;
  status: TransferStatus;
  notes: string | null;
  fromAccountId: string;
  toAccountId: string;
  fromAccount: Account;
  toAccount: Account;
}
export interface GoalContribution {
  id: string;
  amount: string;
  date: string;
  notes: string | null;
  accountId: string | null;
  account: Account | null;
}
export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: string;
  initialAmount: string;
  deadline: string | null;
  color: string;
  status: GoalStatus;
  effectiveStatus: GoalStatus;
  notes: string | null;
  contributions: GoalContribution[];
  savedAmount: number;
  remainingAmount: number;
  percentage: number;
  daysRemaining: number | null;
  monthlyNeeded: number | null;
  isOverdue: boolean;
}
export interface Transaction {
  id: string;
  description: string;
  amount: string;
  type: TransactionType;
  status: StoredTransactionStatus;
  effectiveStatus: TransactionStatus;
  date: string;
  notes: string | null;
  paymentMethod?: PaymentMethod | null;
  cardId?: string | null;
  card?: CreditCard | null;
  categoryId: string;
  category: Category;
  accountId: string | null;
  account: Account | null;
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  recurringId?: string | null;
  attachments?: TransactionAttachment[];
}
export interface TransactionAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}
export type FinancialAlertSeverity = "CRITICAL" | "WARNING" | "INFO";
export type FinancialAlertKind = "OVERDUE_TRANSACTION" | "UPCOMING_TRANSACTION" | "BUDGET" | "CARD_INVOICE" | "GOAL";

export interface FinancialAlert {
  id: string;
  kind: FinancialAlertKind;
  severity: FinancialAlertSeverity;
  title: string;
  message: string;
  date: string | null;
  actionView: "transactions" | "budgets" | "cards" | "goals";
}

export interface AlertsResponse {
  items: FinancialAlert[];
  generatedAt: string;
}

export interface Summary {
  month: string;
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
  forecast: {
    pendingIncome: number;
    pendingExpense: number;
    projectedBalance: number;
    pendingCount: number;
    overdueCount: number;
  };
  previousMonth: {
    income: number;
    expense: number;
    balance: number;
  };
  trend: Array<{ day: number; income: number; expense: number }>;
  expenseCategories: Array<{
    id: string;
    name: string;
    color: string;
    total: number;
  }>;
  recent: Transaction[];
}
export interface FinancialReport {
  period: { from: string; to: string };
  totals: { income: number; expense: number; balance: number; count: number };
  comparison: {
    period: { from: string; to: string };
    totals: { income: number; expense: number; balance: number; count: number };
    change: { income: number; expense: number; balance: number };
  };
  categories: Array<{
    id: string;
    name: string;
    color: string;
    type: TransactionType;
    total: number;
    count: number;
  }>;
  analytics: {
    monthly: Array<{ month: string; income: number; expense: number; balance: number; count: number }>;
    accounts: Array<{ id: string; name: string; color?: string; total: number; count: number }>;
    paymentMethods: Array<{ id: PaymentMethod; name: string; total: number; count: number }>;
    cards: Array<{ id: string; name: string; color?: string; total: number; count: number }>;
    netWorth: Array<{ month: string; liquidBalance: number; goalSavings: number; cardDebt: number; netWorth: number }>;
  };
  items: Transaction[];
}
export interface ImportPreview {
  rows: Array<{
    raw: { rowNumber: number; date: string; description: string; amount: string; type: string; category: string; account: string; paymentMethod: string; card: string; status: string; notes: string };
    errors: string[];
    warnings: string[];
    duplicate: boolean;
    normalized: null | { date: string; description: string; amount: number; type: TransactionType; status: StoredTransactionStatus };
  }>;
  summary: { total: number; valid: number; invalid: number; duplicates: number };
}
