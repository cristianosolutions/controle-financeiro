import { Pause, Pencil, Play, Plus, Repeat2, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { paymentMethodLabels, recurrenceFrequencyLabels, type Account, type Category, type CreditCard, type PaymentMethod, type RecurrenceFrequency, type RecurringTransaction, type TransactionType } from "../types";

interface Props {
  items: RecurringTransaction[];
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  onChanged: () => void;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const paymentMethods: Array<{ value: PaymentMethod; label: string }> = Object.entries(paymentMethodLabels).map(([value, label]) => ({ value: value as PaymentMethod, label }));

function payloadFrom(item: RecurringTransaction, isActive = item.isActive) {
  return {
    description: item.description, amount: Number(item.amount), type: item.type,
    frequency: item.frequency, intervalDays: item.intervalDays,
    startDate: item.startDate.slice(0, 10), endDate: item.endDate?.slice(0, 10) ?? null,
    categoryId: item.categoryId, accountId: item.accountId, cardId: item.cardId,
    notes: item.notes, paymentMethod: item.paymentMethod, isActive,
  };
}

export function RecurrencesView({ items, categories, accounts, cards, onChanged }: Props) {
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [paymentMethod, setPaymentMethod] = useState<"" | PaymentMethod>("OTHER");
  const [error, setError] = useState("");

  function openForm(item?: RecurringTransaction) {
    setEditing(item ?? null);
    setType(item?.type ?? "EXPENSE");
    setFrequency(item?.frequency ?? "MONTHLY");
    setPaymentMethod(item?.paymentMethod ?? (item?.type === "INCOME" ? "" : "OTHER"));
    setFormOpen(true);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api(`/recurrences${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ ...raw, amount: Number(raw.amount), type, frequency, intervalDays: frequency === "CUSTOM" ? Number(raw.intervalDays) : null, endDate: raw.endDate || null, paymentMethod: type === "EXPENSE" ? paymentMethod : null, accountId: paymentMethod === "CREDIT_CARD" ? null : raw.accountId, cardId: paymentMethod === "CREDIT_CARD" ? raw.cardId : null, isActive: editing?.isActive ?? true }),
      });
      setFormOpen(false);
      setEditing(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function toggle(item: RecurringTransaction) {
    try {
      await api(`/recurrences/${item.id}`, { method: "PUT", body: JSON.stringify(payloadFrom(item, !item.isActive)) });
      onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
  }

  async function remove(item: RecurringTransaction) {
    if (!confirm(`Excluir a recorrência ${item.description}? Os lançamentos futuros pendentes serão removidos.`)) return;
    try {
      await api(`/recurrences/${item.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
  }

  return <section className="content-section">
    <div className="section-heading"><div><p className="eyebrow">Automação</p><h1>Recorrências</h1><p className="muted">Programe compromissos e receitas que se repetem ao longo do tempo.</p></div><button className="primary-button compact" onClick={() => formOpen ? setFormOpen(false) : openForm()}><Plus size={18} /> Nova recorrência</button></div>
    {formOpen && <form key={editing?.id ?? "new"} className="recurrence-form" onSubmit={submit}>
      <div className="recurrence-form-heading"><h2>{editing ? "Editar recorrência" : "Nova recorrência"}</h2><div className="segmented mini"><button type="button" className={type === "EXPENSE" ? "active expense" : ""} onClick={() => { setType("EXPENSE"); setPaymentMethod("OTHER"); }}>Despesa</button><button type="button" className={type === "INCOME" ? "active income" : ""} onClick={() => { setType("INCOME"); setPaymentMethod(""); }}>Receita</button></div></div>
      <div className="recurrence-fields"><label>Descrição<input name="description" defaultValue={editing?.description} placeholder="Ex: Aluguel" required /></label><label>Valor<input name="amount" type="number" min="0.01" step="0.01" defaultValue={editing?.amount} required /></label><label>Frequência<select value={frequency} onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency)}>{Object.entries(recurrenceFrequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{frequency === "CUSTOM" && <label>Intervalo em dias<input name="intervalDays" type="number" min="1" max="365" defaultValue={editing?.intervalDays ?? 30} required /></label>}<label>Data inicial<input name="startDate" type="date" defaultValue={editing?.startDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} required /></label><label>Data final <span className="optional">opcional</span><input name="endDate" type="date" defaultValue={editing?.endDate?.slice(0, 10) ?? ""} /></label><label>Categoria<select name="categoryId" defaultValue={editing?.categoryId ?? ""} required><option value="" disabled>Selecione</option>{categories.filter((category) => !category.type || category.type === type).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>{type === "EXPENSE" && <label>Forma de pagamento<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} required><option value="" disabled>Selecione</option>{paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>}{paymentMethod === "CREDIT_CARD" && type === "EXPENSE" ? <label>Cartão<select name="cardId" defaultValue={editing?.cardId ?? ""} required><option value="" disabled>Selecione</option>{cards.filter((card) => card.isActive || card.id === editing?.cardId).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label> : <label>Conta<select name="accountId" defaultValue={editing?.accountId ?? accounts.find((account) => account.isActive)?.id ?? ""} required>{accounts.filter((account) => account.isActive || account.id === editing?.accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}<label className="recurrence-notes">Observação <span className="optional">opcional</span><input name="notes" defaultValue={editing?.notes ?? ""} /></label></div>
      <div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setFormOpen(false)}>Cancelar</button><button className="primary-button">{editing ? "Salvar alterações" : "Criar recorrência"}</button></div>
    </form>}
    {error && <div className="form-error spaced">{error}</div>}
    <div className="recurrence-list">{items.map((item) => <article className={`recurrence-card${item.isActive ? "" : " inactive"}`} key={item.id}><span className="recurrence-icon"><Repeat2 /></span><div><div className="recurrence-title"><h3>{item.description}</h3><em>{item.isActive ? "Ativa" : "Pausada"}</em></div><strong className={item.type === "INCOME" ? "money income" : "money expense"}>{currency.format(Number(item.amount))}</strong><p>{recurrenceFrequencyLabels[item.frequency]} · {item.category.name} · {item.card?.name ?? item.account?.name} · {item._count?.transactions ?? 0} lançamentos gerados</p></div><div className="row-actions"><button className="icon-button" onClick={() => openForm(item)} title="Editar"><Pencil size={16} /></button><button className="icon-button" onClick={() => toggle(item)} title={item.isActive ? "Pausar" : "Ativar"}>{item.isActive ? <Pause size={16} /> : <Play size={16} />}</button><button className="icon-button danger" onClick={() => remove(item)} title="Excluir"><Trash2 size={16} /></button></div></article>)}</div>
    {!items.length && <div className="empty-state"><Repeat2 /><h3>Nenhuma recorrência</h3><p>Cadastre seu primeiro compromisso automático.</p></div>}
  </section>;
}
