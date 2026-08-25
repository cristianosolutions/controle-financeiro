import { ChevronLeft, ChevronRight, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { TransactionAttachments } from "./TransactionAttachments";
import { api } from "../lib/api";
import {
  paymentMethodLabels,
  transactionStatusLabels,
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
  const [attachmentTransaction, setAttachmentTransaction] = useState<Transaction | null>(null);
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
              <em className={`status-badge status-${item.effectiveStatus.toLowerCase()}`}>
                {transactionStatusLabels[item.effectiveStatus]}
              </em>
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
                  {item.card ? ` · ${item.card.name}` : ""}
                </small>
              )}
              <small>{item.account ? `Conta: ${item.account.name}` : item.card ? `Fatura: ${item.card.name}` : ""}</small>
              {item.recurringId && <small>Gerado por recorrência</small>}
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
              <button className="icon-button attachment-button" onClick={() => setAttachmentTransaction(item)} title="Comprovantes"><Paperclip size={16} />{Boolean(item.attachments?.length) && <i>{item.attachments!.length}</i>}</button>
              <button className="icon-button" onClick={() => onEdit(item)} aria-label={`Editar ${item.description}`}>
                <Pencil size={16} />
              </button>
              <button
                className="icon-button danger"
                onClick={() => remove(item.id)}
                aria-label={`Excluir ${item.description}`}
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
      {attachmentTransaction && <TransactionAttachments transaction={attachmentTransaction} onClose={() => setAttachmentTransaction(null)} onChanged={onChanged} />}
    </section>
  );
}
