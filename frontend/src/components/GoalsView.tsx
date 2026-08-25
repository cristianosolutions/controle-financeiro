import { CalendarDays, CheckCircle2, Flag, Pencil, Plus, Target, Trash2, Trophy, WalletCards, XCircle } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { Account, FinancialGoal } from "../types";

interface Props { accounts: Account[]; onFinancialChanged: () => void; }
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = new Date().toISOString().slice(0, 10);
const colors = ["#4f46e5", "#0891b2", "#16a34a", "#ea580c", "#dc2626", "#9333ea", "#64748b"];

export function GoalsView({ accounts, onFinancialChanged }: Props) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [editing, setEditing] = useState<FinancialGoal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [contributing, setContributing] = useState<FinancialGoal | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setGoals(await api<FinancialGoal[]>("/goals")); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar as metas"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function openGoal(goal?: FinancialGoal) { setEditing(goal ?? null); setFormOpen(true); setContributing(null); setError(""); }
  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const body = { ...data, targetAmount: Number(data.targetAmount), initialAmount: Number(data.initialAmount || 0), deadline: data.deadline ? `${data.deadline}T00:00:00.000Z` : null, notes: data.notes || null, status: data.status || "ACTIVE" };
    try { await api(editing ? `/goals/${editing.id}` : "/goals", { method: editing ? "PUT" : "POST", body: JSON.stringify(body) }); setFormOpen(false); setEditing(null); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar a meta"); }
  }
  async function removeGoal(goal: FinancialGoal) {
    if (!confirm(`Excluir a meta “${goal.name}” e todos os seus aportes?`)) return;
    try { await api(`/goals/${goal.id}`, { method: "DELETE" }); await load(); onFinancialChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível excluir a meta"); }
  }
  async function saveContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contributing) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await api(`/goals/${contributing.id}/contributions`, { method: "POST", body: JSON.stringify({ amount: Number(data.amount), date: `${data.date}T00:00:00.000Z`, accountId: data.accountId || null, notes: data.notes || null }) }); setContributing(null); await load(); onFinancialChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível registrar o aporte"); }
  }
  async function removeContribution(goalId: string, contributionId: string) {
    if (!confirm("Remover este aporte? O saldo da conta vinculada será recalculado.")) return;
    try { await api(`/goals/${goalId}/contributions/${contributionId}`, { method: "DELETE" }); await load(); onFinancialChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível remover o aporte"); }
  }

  const active = goals.filter((goal) => goal.effectiveStatus === "ACTIVE");
  const totalSaved = goals.reduce((sum, goal) => sum + goal.savedAmount, 0);
  const completed = goals.filter((goal) => goal.effectiveStatus === "COMPLETED").length;
  return <section className="content-section goals-section">
    <div className="section-heading"><div><p className="eyebrow">Conquistas planejadas</p><h1>Metas financeiras</h1><p className="muted">Transforme seus planos em objetivos mensuráveis e acompanhe cada aporte.</p></div><button className="primary-button compact" onClick={() => formOpen ? setFormOpen(false) : openGoal()}><Plus size={18} /> Nova meta</button></div>
    <div className="goals-overview"><div><span><Target /></span><small>Metas ativas</small><strong>{active.length}</strong></div><div><span><WalletCards /></span><small>Total reservado</small><strong>{currency.format(totalSaved)}</strong></div><div><span><Trophy /></span><small>Concluídas</small><strong>{completed}</strong></div></div>
    {formOpen && <form className="inline-card goal-form" onSubmit={saveGoal} key={editing?.id ?? "new"}><div className="inline-form-title"><div><p className="eyebrow">{editing ? "Editar objetivo" : "Novo objetivo"}</p><h2>{editing ? editing.name : "Criar meta financeira"}</h2></div><button type="button" className="icon-button" onClick={() => setFormOpen(false)}><XCircle /></button></div><div className="form-grid"><label className="wide">Nome da meta<input name="name" defaultValue={editing?.name} placeholder="Ex: Reserva de emergência" required minLength={2} /></label><label>Valor desejado (R$)<input name="targetAmount" type="number" min="0.01" step="0.01" defaultValue={editing?.targetAmount} required /></label><label>Valor inicial (R$)<input name="initialAmount" type="number" min="0" step="0.01" defaultValue={editing?.initialAmount ?? 0} required /></label><label>Prazo<input name="deadline" type="date" defaultValue={editing?.deadline?.slice(0, 10) ?? ""} /></label><label>Status<select name="status" defaultValue={editing?.status ?? "ACTIVE"}><option value="ACTIVE">Ativa</option><option value="COMPLETED">Concluída</option><option value="CANCELED">Cancelada</option></select></label><label className="wide">Cor<div className="goal-colors">{colors.map((color, index) => <span key={color}><input type="radio" name="color" value={color} defaultChecked={editing ? editing.color === color : index === 0} /><i style={{ background: color }} /></span>)}</div></label><label className="wide">Observação<textarea name="notes" defaultValue={editing?.notes ?? ""} placeholder="Opcional" /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Cancelar</button><button className="primary-button">Salvar meta</button></div></form>}
    {contributing && <form className="inline-card contribution-form" onSubmit={saveContribution}><div><p className="eyebrow">Novo aporte</p><h2>{contributing.name}</h2></div><label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" required autoFocus /></label><label>Data<input name="date" type="date" defaultValue={today} required /></label><label>Retirar da conta<select name="accountId" defaultValue=""><option value="">Não vincular a uma conta</option>{accounts.filter((account) => account.isActive).map((account) => <option value={account.id} key={account.id}>{account.name} · {currency.format(account.balance)}</option>)}</select></label><label>Observação<input name="notes" placeholder="Opcional" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setContributing(null)}>Cancelar</button><button className="primary-button">Registrar aporte</button></div></form>}
    {error && <div className="form-error spaced">{error}</div>}
    {loading ? <div className="empty-state"><p>Carregando metas...</p></div> : <div className="goals-grid">{goals.map((goal) => { const progress = Math.min(100, goal.percentage); return <article className={`goal-card goal-${goal.effectiveStatus.toLowerCase()}`} key={goal.id}><div className="goal-card-top"><span style={{ color: goal.color, background: `${goal.color}18` }}><Flag /></span><div><small>{goal.effectiveStatus === "COMPLETED" ? "Meta concluída" : goal.effectiveStatus === "CANCELED" ? "Meta cancelada" : "Meta em andamento"}</small><h3>{goal.name}</h3></div><div className="row-actions"><button className="icon-button" title="Editar" onClick={() => openGoal(goal)}><Pencil size={16} /></button><button className="icon-button danger" title="Excluir" onClick={() => void removeGoal(goal)}><Trash2 size={16} /></button></div></div><div className="goal-amount"><strong>{currency.format(goal.savedAmount)}</strong><span>de {currency.format(Number(goal.targetAmount))}</span></div><div className="goal-track"><i style={{ width: `${progress}%`, background: goal.color }} /></div><div className="goal-meta"><strong>{Math.round(goal.percentage)}%</strong><span>{currency.format(goal.remainingAmount)} restante</span></div>{goal.deadline && <div className={`goal-deadline ${goal.isOverdue ? "overdue" : ""}`}><CalendarDays size={15} />{goal.isOverdue ? "Prazo vencido" : `${goal.daysRemaining} dias restantes`}{goal.monthlyNeeded !== null && goal.remainingAmount > 0 && <span>· {currency.format(goal.monthlyNeeded)}/mês</span>}</div>}<div className="goal-actions">{goal.effectiveStatus === "ACTIVE" && <button className="primary-button compact" onClick={() => { setContributing(goal); setFormOpen(false); }}>+ Adicionar aporte</button>}<button className="secondary-button compact" onClick={() => setExpanded(expanded === goal.id ? null : goal.id)}>{expanded === goal.id ? "Ocultar histórico" : `Ver aportes (${goal.contributions.length})`}</button></div>{expanded === goal.id && <div className="contribution-list">{goal.contributions.map((item) => <div key={item.id}><span><strong>{currency.format(Number(item.amount))}</strong><small>{new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}{item.account ? ` · ${item.account.name}` : ""}</small></span><button className="icon-button danger" onClick={() => void removeContribution(goal.id, item.id)}><Trash2 size={15} /></button></div>)}{!goal.contributions.length && <p className="muted">Nenhum aporte registrado.</p>}</div>}</article>; })}</div>}
    {!loading && !goals.length && <div className="empty-state"><Trophy /><h3>Crie sua primeira meta</h3><p>Comece por uma reserva de emergência ou outro objetivo importante.</p></div>}
  </section>;
}
