import { CalendarDays, CreditCard as CardIcon, Power, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { Account, CardInvoicesResponse, CreditCard } from "../types";

interface Props {
  cards: CreditCard[];
  accounts: Account[];
  onChanged: () => void;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = new Date().toISOString().slice(0, 10);

export function CardsView({ cards, accounts, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const [color, setColor] = useState("#4f46e5");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<CardInvoicesResponse | null>(null);
  const [payAccountId, setPayAccountId] = useState(accounts.find((account) => account.isActive)?.id ?? "");
  const [error, setError] = useState("");

  async function loadInvoices(cardId: string) {
    try {
      setInvoiceData(await api<CardInvoicesResponse>(`/cards/${cardId}/invoices`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar faturas");
    }
  }

  useEffect(() => {
    if (selectedId) void loadInvoices(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!payAccountId) setPayAccountId(accounts.find((account) => account.isActive)?.id ?? "");
  }, [accounts, payAccountId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/cards", { method: "POST", body: JSON.stringify({ ...data, creditLimit: Number(data.creditLimit), closingDay: Number(data.closingDay), dueDay: Number(data.dueDay), isActive: true }) });
      setAdding(false);
      setColor("#4f46e5");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function toggle(card: CreditCard) {
    try {
      await api(`/cards/${card.id}`, { method: "PUT", body: JSON.stringify({ name: card.name, brand: card.brand, creditLimit: Number(card.creditLimit), closingDay: card.closingDay, dueDay: card.dueDay, color: card.color, isActive: !card.isActive }) });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function remove(card: CreditCard) {
    if (!confirm(`Excluir o cartão ${card.name}?`)) return;
    try {
      await api(`/cards/${card.id}`, { method: "DELETE" });
      if (selectedId === card.id) { setSelectedId(null); setInvoiceData(null); }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function pay(referenceMonth: string) {
    if (!selectedId || !payAccountId) return;
    try {
      await api(`/cards/${selectedId}/invoices/${referenceMonth}/pay`, { method: "POST", body: JSON.stringify({ accountId: payAccountId, paidAt: today }) });
      await loadInvoices(selectedId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function undoPayment(referenceMonth: string) {
    if (!selectedId || !confirm("Desfazer o pagamento desta fatura?")) return;
    try {
      await api(`/cards/${selectedId}/invoices/${referenceMonth}/payment`, { method: "DELETE" });
      await loadInvoices(selectedId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  return (
    <section className="content-section">
      <div className="section-heading"><div><p className="eyebrow">Crédito</p><h1>Cartões e faturas</h1><p className="muted">Controle limites, vencimentos e pagamentos sem depender do banco.</p></div><button className="primary-button compact" onClick={() => setAdding(!adding)}><Plus size={18} /> Novo cartão</button></div>
      {adding && <form className="inline-card card-form" onSubmit={submit}><label>Nome<input name="name" placeholder="Ex: Nubank" required /></label><label>Bandeira<input name="brand" placeholder="Ex: Mastercard" /></label><label>Limite<input name="creditLimit" type="number" min="0" step="0.01" required /></label><label>Fechamento<input name="closingDay" type="number" min="1" max="31" required /></label><label>Vencimento<input name="dueDay" type="number" min="1" max="31" required /></label><fieldset className="color-field"><legend>Cor</legend><label className="color-picker"><input type="color" name="color" value={color} onChange={(event) => setColor(event.target.value)} /><span className="color-wheel"><i style={{ background: color }} /></span></label></fieldset><button className="primary-button compact">Adicionar</button></form>}
      {error && <div className="form-error spaced">{error}</div>}
      <div className="cards-grid">
        {cards.map((card) => { const limit = Number(card.creditLimit); const percent = limit > 0 ? Math.min(100, (card.usedLimit / limit) * 100) : 0; return <article className={`credit-card-panel${card.isActive ? "" : " inactive"}`} key={card.id} style={{ "--card-color": card.color } as React.CSSProperties}><div className="credit-card-title"><span><CardIcon /></span><div><small>{card.brand || "Cartão de crédito"}</small><h3>{card.name}</h3></div><div className="row-actions"><button className="icon-button" onClick={() => toggle(card)} title={card.isActive ? "Desativar" : "Reativar"}><Power size={16} /></button><button className="icon-button danger" onClick={() => remove(card)} title="Excluir"><Trash2 size={16} /></button></div></div><div className="card-limit-row"><div><small>Utilizado</small><strong>{currency.format(card.usedLimit)}</strong></div><div><small>Disponível</small><strong>{limit ? currency.format(card.availableLimit) : "Não informado"}</strong></div></div><div className="limit-track"><i style={{ width: `${percent}%` }} /></div><div className="card-dates"><span><CalendarDays size={15} /> Fecha dia {card.closingDay}</span><span>Vence dia {card.dueDay}</span></div><button className="secondary-button card-invoices-button" onClick={() => setSelectedId(card.id)}><ReceiptText size={17} /> Ver faturas</button></article>; })}
      </div>
      {invoiceData && <section className="invoice-section"><div className="invoice-heading"><div><p className="eyebrow">Faturas</p><h2>{invoiceData.card.name}</h2></div><label>Conta para pagamento<select value={payAccountId} onChange={(event) => setPayAccountId(event.target.value)}>{accounts.filter((account) => account.isActive).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div>{invoiceData.invoices.map((invoice) => <article className="invoice-row" key={invoice.referenceMonth}><div><small>Fatura de {new Date(`${invoice.referenceMonth}-02T00:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</small><strong>{currency.format(invoice.total)}</strong><span>Vence em {new Date(invoice.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {invoice.items.length} compras</span></div>{invoice.payment ? <div className="invoice-paid"><b>Pago</b><small>{invoice.payment.account.name}</small><button className="text-button" onClick={() => undoPayment(invoice.referenceMonth)}>Desfazer</button></div> : <button className="primary-button compact" disabled={!payAccountId} onClick={() => pay(invoice.referenceMonth)}>Marcar como paga</button>}</article>)}{!invoiceData.invoices.length && <div className="empty-state"><p>Nenhuma fatura encontrada para este cartão.</p></div>}</section>}
    </section>
  );
}
