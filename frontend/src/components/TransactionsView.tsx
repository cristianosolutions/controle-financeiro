import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import {
  paymentMethodLabels,
  type Category,
  type Transaction,
  type TransactionType,
} from "../types";

interface Props {
  items: Transaction[];
  categories: Category[];
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onNew: () => void;
  onEdit: (item: Transaction) => void;
  onChanged: () => void;
}
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function TransactionsView({
  items,
  categories,
  page,
  pages,
  onPage,
  onNew,
  onEdit,
  onChanged,
}: Props) {
  async function remove(id: string) {
    if (confirm("Excluir este lançamento?")) {
      await api(`/transactions/${id}`, { method: "DELETE" });
      onChanged();
    }
  }
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Movimentações</p>
          <h1>Lançamentos</h1>
          <p className="muted">
            Seu histórico financeiro, organizado em uma linha do tempo.
          </p>
        </div>
        <button className="primary-button compact" onClick={onNew}>
          <Plus size={18} /> Novo lançamento
        </button>
      </div>
      <div className="table-card">
        <div className="transaction-table table-header">
          <span>Descrição</span>
          <span>Categoria</span>
          <span>Data</span>
          <span>Valor</span>
          <span />
        </div>
        {items.map((item) => (
          <div className="transaction-table" key={item.id}>
            <span className="transaction-name">
              <i
                className={
                  item.type === "INCOME" ? "dot income" : "dot expense"
                }
              />
              {item.description}
            </span>
            <span className="category-info">
              <em
                className="category-pill"
                style={{
                  color: item.category.color,
                  background: `${item.category.color}14`,
                }}
              >
                {item.category.name}
              </em>
              {item.paymentMethod && (
                <small>
                  {paymentMethodLabels[item.paymentMethod]}
                  {item.cardName ? ` · ${item.cardName}` : ""}
                </small>
              )}
            </span>
            <span className="muted">
              {new Date(item.date).toLocaleDateString("pt-BR", {
                timeZone: "UTC",
              })}
            </span>
            <strong
              className={
                item.type === "INCOME" ? "money income" : "money expense"
              }
            >
              {item.type === "INCOME" ? "+ " : "− "}
              {currency.format(Number(item.amount))}
            </strong>
            <span className="row-actions">
              <button className="icon-button" onClick={() => onEdit(item)}>
                <Pencil size={16} />
              </button>
              <button
                className="icon-button danger"
                onClick={() => remove(item.id)}
              >
                <Trash2 size={16} />
              </button>
            </span>
          </div>
        ))}
        {!items.length && (
          <div className="empty-state">
            <p>Nenhum lançamento encontrado neste período.</p>
          </div>
        )}
      </div>
      {pages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft />
          </button>
          <span>
            Página {page} de {pages}
          </span>
          <button disabled={page === pages} onClick={() => onPage(page + 1)}>
            <ChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
