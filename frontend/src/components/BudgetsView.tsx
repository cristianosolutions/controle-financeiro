import { AlertTriangle, Copy, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { Budget, Category } from "../types";

interface Props {
  budgets: Budget[];
  categories: Category[];
  month: string;
  onMonth: (month: string) => void;
  onChanged: () => void;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function previousMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, monthNumber! - 2, 1)).toISOString().slice(0, 7);
}

export function BudgetsView({ budgets, categories, month, onMonth, onChanged }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [error, setError] = useState("");
  const expenseCategories = categories.filter((category) => category.type !== "INCOME");
  const totalLimit = budgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalPending = budgets.reduce((sum, budget) => sum + budget.pending, 0);

  function openForm(budget?: Budget) {
    setEditing(budget ?? null);
    setFormOpen(true);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/budgets", { method: "POST", body: JSON.stringify({ month, categoryId: data.categoryId, amount: Number(data.amount) }) });
      setEditing(null);
      setFormOpen(false);
      onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
  }

  async function copyPrevious() {
    try {
      await api("/budgets/copy", { method: "POST", body: JSON.stringify({ fromMonth: previousMonth(month), toMonth: month }) });
      onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
  }

  async function remove(budget: Budget) {
    if (!confirm(`Excluir o orçamento de ${budget.category.name}?`)) return;
    try {
      await api(`/budgets/${budget.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
  }

  return <section className="content-section">
    <div className="section-heading"><div><p className="eyebrow">Planejamento</p><h1>Orçamentos</h1><p className="muted">Defina limites por categoria e acompanhe seus gastos durante o mês.</p></div><div className="heading-actions budget-heading-actions"><input type="month" value={month} onChange={(event) => onMonth(event.target.value)} /><button className="secondary-button" onClick={copyPrevious}><Copy size={16} /> Copiar mês anterior</button><button className="primary-button compact" onClick={() => formOpen ? setFormOpen(false) : openForm()}><Plus size={18} /> Novo orçamento</button></div></div>
    <div className="budget-overview"><div><small>Limite planejado</small><strong>{currency.format(totalLimit)}</strong></div><div><small>Gasto realizado</small><strong className="money expense">{currency.format(totalSpent)}</strong></div><div><small>Gasto previsto</small><strong>{currency.format(totalPending)}</strong></div><div><small>Disponível</small><strong className={totalLimit - totalSpent >= 0 ? "money income" : "money expense"}>{currency.format(totalLimit - totalSpent)}</strong></div></div>
    {formOpen && <form key={editing?.id ?? "new"} className="inline-card budget-form" onSubmit={submit}><label>Categoria<select name="categoryId" defaultValue={editing?.categoryId ?? ""} disabled={Boolean(editing)} required><option value="" disabled>Selecione uma categoria</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{editing && <input type="hidden" name="categoryId" value={editing.categoryId} />}</label><label>Limite mensal (R$)<input name="amount" type="number" min="0.01" step="0.01" defaultValue={editing?.amount} required /></label><button className="primary-button compact">{editing ? "Atualizar" : "Adicionar"}</button></form>}
    {error && <div className="form-error spaced">{error}</div>}
    <div className="budget-grid">{budgets.map((budget) => { const actualWidth = Math.min(100, budget.percentage); const pendingWidth = Math.max(0, Math.min(100 - actualWidth, budget.projectedPercentage - budget.percentage)); return <article className={`budget-card budget-${budget.alert.toLowerCase()}`} key={budget.id}><div className="budget-card-heading"><span style={{ color: budget.category.color, background: `${budget.category.color}18` }}><Target /></span><div><small>Categoria</small><h3>{budget.category.name}</h3></div><div className="row-actions"><button className="icon-button" onClick={() => openForm(budget)} title="Editar"><Pencil size={16} /></button><button className="icon-button danger" onClick={() => remove(budget)} title="Excluir"><Trash2 size={16} /></button></div></div><div className="budget-values"><div><small>Utilizado</small><strong>{currency.format(budget.spent)}</strong></div><div><small>Limite</small><strong>{currency.format(Number(budget.amount))}</strong></div></div><div className="budget-track"><i className="budget-actual" style={{ width: `${actualWidth}%`, background: budget.category.color }} /><i className="budget-pending" style={{ width: `${pendingWidth}%` }} /></div><div className="budget-progress-meta"><span>{Math.round(budget.percentage)}% utilizado</span><strong>{currency.format(budget.remaining)} restante</strong></div>{budget.pending > 0 && <p className="budget-projection">Com previstos: {currency.format(budget.spent + budget.pending)} ({Math.round(budget.projectedPercentage)}%)</p>}{budget.alert !== "OK" && <div className="budget-alert"><AlertTriangle size={15} />{budget.alert === "EXCEEDED" ? "Limite mensal ultrapassado" : "Você já utilizou pelo menos 80% do limite"}</div>}</article>; })}</div>
    {!budgets.length && <div className="empty-state"><Target /><h3>Nenhum orçamento para este mês</h3><p>Defina limites ou copie os valores do mês anterior.</p></div>}
  </section>;
}
