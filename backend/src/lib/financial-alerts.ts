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

type DatedItem = { id: string; description: string; amount: number; date: Date };
type BudgetItem = { id: string; categoryName: string; amount: number; spent: number };
type InvoiceItem = { cardId: string; cardName: string; referenceMonth: string; total: number; dueDate: Date };
type GoalItem = { id: string; name: string; deadline: Date; currentAmount: number; targetAmount: number };

function dayStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function daysBetween(from: Date, to: Date) {
  return Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / 86_400_000);
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function buildFinancialAlerts(input: {
  today: Date;
  pendingTransactions: DatedItem[];
  budgets: BudgetItem[];
  invoices: InvoiceItem[];
  goals: GoalItem[];
}) {
  const alerts: FinancialAlert[] = [];

  for (const item of input.pendingTransactions) {
    const days = daysBetween(input.today, item.date);
    if (days < 0) {
      alerts.push({ id: `transaction-overdue:${item.id}`, kind: "OVERDUE_TRANSACTION", severity: "CRITICAL", title: "Lançamento vencido", message: `${item.description} (${money(item.amount)}) venceu há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}.`, date: isoDate(item.date), actionView: "transactions" });
    } else if (days <= 7) {
      const when = days === 0 ? "vence hoje" : `vence em ${days} dia${days === 1 ? "" : "s"}`;
      alerts.push({ id: `transaction-upcoming:${item.id}`, kind: "UPCOMING_TRANSACTION", severity: days <= 1 ? "WARNING" : "INFO", title: "Vencimento próximo", message: `${item.description} (${money(item.amount)}) ${when}.`, date: isoDate(item.date), actionView: "transactions" });
    }
  }

  for (const budget of input.budgets) {
    const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    if (percentage >= 80) {
      const exceeded = percentage >= 100;
      alerts.push({ id: `budget:${budget.id}:${Math.floor(percentage)}`, kind: "BUDGET", severity: exceeded ? "CRITICAL" : "WARNING", title: exceeded ? "Orçamento excedido" : "Orçamento próximo do limite", message: `${budget.categoryName}: ${Math.round(percentage)}% de ${money(budget.amount)} utilizado.`, date: null, actionView: "budgets" });
    }
  }

  for (const invoice of input.invoices) {
    const days = daysBetween(input.today, invoice.dueDate);
    if (days <= 7) {
      const overdue = days < 0;
      const when = overdue ? `venceu há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}` : days === 0 ? "vence hoje" : `vence em ${days} dia${days === 1 ? "" : "s"}`;
      alerts.push({ id: `invoice:${invoice.cardId}:${invoice.referenceMonth}`, kind: "CARD_INVOICE", severity: overdue || days <= 1 ? "CRITICAL" : "WARNING", title: overdue ? "Fatura vencida" : "Fatura próxima do vencimento", message: `${invoice.cardName}: ${money(invoice.total)} ${when}.`, date: isoDate(invoice.dueDate), actionView: "cards" });
    }
  }

  for (const goal of input.goals) {
    const days = daysBetween(input.today, goal.deadline);
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    if (days <= 30 && progress < 100) {
      const overdue = days < 0;
      alerts.push({ id: `goal:${goal.id}:${isoDate(goal.deadline)}`, kind: "GOAL", severity: overdue ? "CRITICAL" : days <= 7 ? "WARNING" : "INFO", title: overdue ? "Prazo da meta encerrado" : "Prazo da meta se aproximando", message: `${goal.name}: ${Math.round(progress)}% concluída${overdue ? " e prazo vencido" : `, faltam ${days} dias`}.`, date: isoDate(goal.deadline), actionView: "goals" });
    }
  }

  const priority = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;
  return alerts.sort((a, b) => priority[a.severity] - priority[b.severity] || (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}
