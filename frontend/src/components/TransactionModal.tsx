import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import type { Category, Transaction, TransactionType } from "../types";

interface Props { categories: Category[]; transaction?: Transaction | null; onClose: () => void; onSaved: () => void }

export function TransactionModal({ categories, transaction, onClose, onSaved }: Props) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "EXPENSE");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const available = categories.filter((item) => !item.type || item.type === type);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      await api(`/transactions${transaction ? `/${transaction.id}` : ""}`, { method: transaction ? "PUT" : "POST", body: JSON.stringify({ ...payload, type }) });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
    finally { setLoading(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal-card">
      <div className="modal-header"><div><span className="eyebrow">Lançamento</span><h2>{transaction ? "Editar transação" : "Nova transação"}</h2></div><button className="icon-button" onClick={onClose}><X /></button></div>
      <form onSubmit={submit}>
        <div className="segmented"><button type="button" className={type === "EXPENSE" ? "active expense" : ""} onClick={() => setType("EXPENSE")}>Despesa</button><button type="button" className={type === "INCOME" ? "active income" : ""} onClick={() => setType("INCOME")}>Receita</button></div>
        <label>Descrição<input name="description" defaultValue={transaction?.description} placeholder="Ex: Supermercado" required /></label>
        <div className="form-grid"><label>Valor (R$)<input name="amount" type="number" step="0.01" min="0.01" defaultValue={transaction?.amount} placeholder="0,00" required /></label><label>Data<input name="date" type="date" defaultValue={(transaction?.date ?? new Date().toISOString()).slice(0, 10)} required /></label></div>
        <label>Categoria<select name="categoryId" defaultValue={transaction?.categoryId ?? ""} required><option value="" disabled>Selecione uma categoria</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Observação <span className="optional">opcional</span><textarea name="notes" defaultValue={transaction?.notes ?? ""} placeholder="Adicione um detalhe" rows={3} /></label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={loading}>{loading ? "Salvando..." : "Salvar lançamento"}</button></div>
      </form>
    </section>
  </div>;
}
