import { useState, type FormEvent } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { Category, TransactionType } from "../types";

interface Props { categories: Category[]; onChanged: () => void }
const colors = ["#4f46e5", "#0891b2", "#16a34a", "#ea580c", "#dc2626", "#9333ea", "#64748b"];

export function CategoriesView({ categories, onChanged }: Props) {
  const [adding, setAdding] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await api("/categories", { method: "POST", body: JSON.stringify({ ...data, type: data.type || null }) }); setAdding(false); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    try { await api(`/categories/${id}`, { method: "DELETE" }); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
  }
  return <section className="content-section">
    <div className="section-heading"><div><p className="eyebrow">Organização</p><h1>Categorias</h1><p className="muted">Agrupe seus lançamentos e entenda para onde vai seu dinheiro.</p></div><button className="primary-button compact" onClick={() => setAdding(!adding)}><Plus size={18} /> Nova categoria</button></div>
    {adding && <form className="inline-card" onSubmit={submit}>
      <label>Nome<input name="name" placeholder="Ex: Moradia" required /></label>
      <label>Tipo<select name="type"><option value="">Receita e despesa</option><option value={"EXPENSE" satisfies TransactionType}>Despesa</option><option value={"INCOME" satisfies TransactionType}>Receita</option></select></label>
      <fieldset className="color-field"><legend>Cor</legend><div className="color-palette">{colors.map((color, index) => <label className="color-option" key={color} title={`Selecionar cor ${index + 1}`}><input type="radio" name="color" value={color} defaultChecked={index === 0} /><span style={{ backgroundColor: color }} /><i>Cor {index + 1}</i></label>)}</div></fieldset>
      <button className="primary-button compact">Adicionar</button>
    </form>}
    {error && <div className="form-error spaced">{error}</div>}
    <div className="category-grid">{categories.map((category) => <article className="category-card" key={category.id}>
      <span className="category-icon" style={{ background: `${category.color}18`, color: category.color }}><Tag /></span>
      <div><h3>{category.name}</h3><p>{category.type === "INCOME" ? "Receitas" : category.type === "EXPENSE" ? "Despesas" : "Todos os tipos"} · {category._count?.transactions ?? 0} lançamentos</p></div>
      <button className="icon-button danger" onClick={() => remove(category.id)} aria-label="Excluir"><Trash2 size={18} /></button>
    </article>)}</div>
    {!categories.length && <div className="empty-state"><Tag /><h3>Nenhuma categoria</h3><p>Crie a primeira para começar a lançar suas movimentações.</p></div>}
  </section>;
}
