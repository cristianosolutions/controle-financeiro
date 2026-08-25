import { Power, Plus, Trash2, WalletCards } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { accountTypeLabels, type Account, type AccountType } from "../types";

interface Props {
  accounts: Account[];
  onChanged: () => void;
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AccountsView({ accounts, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const [color, setColor] = useState("#4f46e5");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/accounts", { method: "POST", body: JSON.stringify({ ...data, initialBalance: Number(data.initialBalance || 0), isActive: true }) });
      setAdding(false);
      setColor("#4f46e5");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function toggle(account: Account) {
    setError("");
    try {
      await api(`/accounts/${account.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: account.name, type: account.type, color: account.color, initialBalance: Number(account.initialBalance), isActive: !account.isActive }),
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  async function remove(account: Account) {
    if (!confirm(`Excluir a conta ${account.name}?`)) return;
    setError("");
    try {
      await api(`/accounts/${account.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Patrimônio</p>
          <h1>Contas e carteiras</h1>
          <p className="muted">Acompanhe onde seu dinheiro está e mantenha os saldos organizados.</p>
        </div>
        <button className="primary-button compact" onClick={() => setAdding(!adding)}><Plus size={18} /> Nova conta</button>
      </div>
      {adding && (
        <form className="inline-card account-form" onSubmit={submit}>
          <label>Nome<input name="name" placeholder="Ex: Conta principal" required /></label>
          <label>Tipo<select name="type" defaultValue={"CHECKING" satisfies AccountType}>{Object.entries(accountTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Saldo inicial<input name="initialBalance" type="number" step="0.01" defaultValue="0" /></label>
          <fieldset className="color-field"><legend>Cor</legend><label className="color-picker" title="Escolher cor"><input type="color" name="color" value={color} onChange={(event) => setColor(event.target.value)} /><span className="color-wheel"><i style={{ background: color }} /></span></label></fieldset>
          <button className="primary-button compact">Adicionar</button>
        </form>
      )}
      {error && <div className="form-error spaced">{error}</div>}
      <div className="account-grid">
        {accounts.map((account) => (
          <article className={`account-card${account.isActive ? "" : " inactive"}`} key={account.id}>
            <span className="account-icon" style={{ background: `${account.color}18`, color: account.color }}><WalletCards /></span>
            <div className="account-details"><small>{accountTypeLabels[account.type]}</small><h3>{account.name}</h3><strong>{currency.format(account.balance)}</strong></div>
            <div className="row-actions"><button className="icon-button" onClick={() => toggle(account)} title={account.isActive ? "Desativar" : "Reativar"}><Power size={17} /></button><button className="icon-button danger" onClick={() => remove(account)} title="Excluir"><Trash2 size={17} /></button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
