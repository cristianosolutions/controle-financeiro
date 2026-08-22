import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import type { Category, PaymentMethod, Transaction, TransactionType } from "../types";

interface Props { categories: Category[]; transaction?: Transaction | null; onClose: () => void; onSaved: () => void }
const cardSuggestions = ["Nubank", "Itaú", "Caixa", "Banco do Brasil", "Bradesco", "Santander", "Inter", "C6 Bank", "PicPay", "Mercado Pago"];
const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "PIX", label: "Pix" }, { value: "CREDIT_CARD", label: "Cartão de crédito" },
  { value: "DEBIT_CARD", label: "Cartão de débito" }, { value: "CASH", label: "Dinheiro" },
  { value: "BANK_TRANSFER", label: "Transferência bancária" }, { value: "BOLETO", label: "Boleto" },
  { value: "OTHER", label: "Outra" },
];

export function TransactionModal({ categories, transaction, onClose, onSaved }: Props) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "EXPENSE");
  const [installments, setInstallments] = useState(1);
  const [amount, setAmount] = useState(Number(transaction?.amount ?? 0));
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"" | PaymentMethod>(transaction?.paymentMethod ?? (transaction?.type === "EXPENSE" ? "OTHER" : ""));
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const available = categories.filter((item) => !item.type || item.type === type);
  const showCard = type === "EXPENSE" && paymentMethod === "CREDIT_CARD";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      await api(`/transactions${transaction ? `/${transaction.id}` : ""}`, { method: transaction ? "PUT" : "POST", body: JSON.stringify({ ...payload, type, ...(!transaction && type === "EXPENSE" ? { installments } : {}) }) });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
    finally { setLoading(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal-card">
      <div className="modal-header"><div><span className="eyebrow">Lançamento</span><h2>{transaction ? "Editar transação" : "Nova transação"}</h2></div><button className="icon-button" onClick={onClose}><X /></button></div>
      <form onSubmit={submit}>
        <div className="segmented"><button type="button" className={type === "EXPENSE" ? "active expense" : ""} onClick={() => { setType("EXPENSE"); setCategoryId(""); setPaymentMethod(""); }}>Despesa</button><button type="button" className={type === "INCOME" ? "active income" : ""} onClick={() => { setType("INCOME"); setCategoryId(""); setPaymentMethod(""); setInstallments(1); }}>Receita</button></div>
        <label>Descrição<input name="description" defaultValue={transaction?.description} placeholder="Ex: Supermercado" required /></label>
        <div className="form-grid"><label>Valor total (R$)<input name="amount" type="number" step="0.01" min="0.01" defaultValue={transaction?.amount} onChange={(event) => setAmount(Number(event.target.value))} placeholder="0,00" required /></label><label>Data<input name="date" type="date" defaultValue={(transaction?.date ?? new Date().toISOString()).slice(0, 10)} required /></label></div>
        <label>Categoria<select name="categoryId" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required><option value="" disabled>Selecione uma categoria</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {type === "EXPENSE" && <label>Forma de pagamento<select name="paymentMethod" value={paymentMethod} onChange={(event) => { const value = event.target.value as PaymentMethod; setPaymentMethod(value); if (value !== "CREDIT_CARD") setInstallments(1); }} required><option value="" disabled>Selecione como pagou</option>{paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>}
        {showCard && <label className="card-name-field">Cartão utilizado<input name="cardName" list="card-suggestions" defaultValue={transaction?.cardName ?? ""} placeholder="Ex: Nubank, Itaú ou Caixa" maxLength={80} autoComplete="off" required /><datalist id="card-suggestions">{cardSuggestions.map((card) => <option key={card} value={card} />)}</datalist><small>Escolha uma sugestão ou digite o nome do seu cartão.</small></label>}
        {!transaction && showCard && <div className="installment-field"><label>Parcelamento<select value={installments} onChange={(event) => setInstallments(Number(event.target.value))}>{Array.from({ length: 60 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count === 1 ? "À vista (1x)" : `${count} parcelas`}</option>)}</select></label><p>{installments === 1 ? "O valor será lançado integralmente na data escolhida." : `${installments} parcelas de aproximadamente ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount / installments)}, uma por mês a partir da data escolhida.`}</p></div>}
        <label>Observação <span className="optional">opcional</span><textarea name="notes" defaultValue={transaction?.notes ?? ""} placeholder="Adicione um detalhe" rows={3} /></label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={loading}>{loading ? "Salvando..." : "Salvar lançamento"}</button></div>
      </form>
    </section>
  </div>;
}
