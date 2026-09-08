import { useState, type FormEvent } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { Category, TransactionType } from "../types";

interface Props {
  categories: Category[];
  onChanged: () => void;
}

export function CategoriesView({ categories, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [selectedColor, setSelectedColor] = useState("#4f46e5");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    try {
      await api(editing ? `/categories/${editing.id}` : "/categories", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ ...data, type: data.type || null }),
      });
      setAdding(false);
      setEditing(null);
      setSelectedColor("#4f46e5");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }
  function openNew() {
    setEditing(null);
    setSelectedColor("#4f46e5");
    setError("");
    setAdding((current) => !current || editing !== null);
  }
  function openEdit(category: Category) {
    setEditing(category);
    setSelectedColor(category.color);
    setError("");
    setAdding(true);
  }
  function closeForm() {
    setAdding(false);
    setEditing(null);
    setSelectedColor("#4f46e5");
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    try {
      await api(`/categories/${id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Organização</p>
          <h1>Categorias</h1>
          <p className="muted">
            Agrupe seus lançamentos e entenda para onde vai seu dinheiro.
          </p>
        </div>
        <button
          className="primary-button compact"
          onClick={openNew}
        >
          <Plus size={18} /> Nova categoria
        </button>
      </div>
      {adding && (
        <form className="inline-card category-form" onSubmit={submit} key={editing?.id ?? "new"}>
          <label>
            Nome
            <input name="name" defaultValue={editing?.name ?? ""} placeholder="Ex: Moradia" required />
          </label>
          <label>
            Tipo
            <select name="type" defaultValue={editing?.type ?? ""}>
              <option value="">Receita e despesa</option>
              <option value={"EXPENSE" satisfies TransactionType}>
                Despesa
              </option>
              <option value={"INCOME" satisfies TransactionType}>
                Receita
              </option>
            </select>
          </label>
          <fieldset className="color-field">
            <legend>Cor</legend>
            <label className="color-picker" title="Escolher cor">
              <input
                type="color"
                name="color"
                value={selectedColor}
                onChange={(event) => setSelectedColor(event.target.value)}
                aria-label="Escolher cor da categoria"
              />
              <span className="color-wheel">
                <i style={{ background: selectedColor }} />
              </span>
            </label>
          </fieldset>
          <div className="form-actions category-form-actions">
            <button type="button" className="secondary-button compact" onClick={closeForm}>Cancelar</button>
            <button className="primary-button compact">{editing ? "Salvar alterações" : "Adicionar"}</button>
          </div>
        </form>
      )}
      {error && <div className="form-error spaced">{error}</div>}
      <div className="category-grid">
        {categories.map((category) => (
          <article className="category-card" key={category.id}>
            <span
              className="category-icon"
              style={{
                background: `${category.color}18`,
                color: category.color,
              }}
            >
              <Tag />
            </span>
            <div>
              <h3>{category.name}</h3>
              <p>
                {category.type === "INCOME"
                  ? "Receitas"
                  : category.type === "EXPENSE"
                    ? "Despesas"
                    : "Todos os tipos"}{" "}
                · {category._count?.transactions ?? 0} lançamentos
              </p>
            </div>
            <div className="row-actions">
              <button className="icon-button" onClick={() => openEdit(category)} aria-label={`Editar ${category.name}`} title="Editar">
                <Pencil size={17} />
              </button>
              <button className="icon-button danger" onClick={() => remove(category.id)} aria-label={`Excluir ${category.name}`} title="Excluir">
                <Trash2 size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!categories.length && (
        <div className="empty-state">
          <Tag />
          <h3>Nenhuma categoria</h3>
          <p>Crie a primeira para começar a lançar suas movimentações.</p>
        </div>
      )}
    </section>
  );
}
