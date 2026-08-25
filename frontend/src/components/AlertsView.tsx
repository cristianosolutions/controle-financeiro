import { AlertCircle, Bell, CalendarClock, CheckCheck, ChevronRight, CircleAlert, Gauge, PiggyBank, Trash2 } from "lucide-react";
import type { FinancialAlert } from "../types";

interface Props {
  items: FinancialAlert[];
  readIds: string[];
  onReadAll: () => void;
  onDismiss: (id: string) => void;
  onOpen: (item: FinancialAlert) => void;
}

const icons = {
  OVERDUE_TRANSACTION: CircleAlert,
  UPCOMING_TRANSACTION: CalendarClock,
  BUDGET: Gauge,
  CARD_INVOICE: AlertCircle,
  GOAL: PiggyBank,
} as const;

export function AlertsView({ items, readIds, onReadAll, onDismiss, onOpen }: Props) {
  const unread = items.filter((item) => !readIds.includes(item.id)).length;
  return (
    <section className="content-section alerts-view" aria-labelledby="alerts-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACOMPANHAMENTO</span>
          <h1 id="alerts-title">Avisos</h1>
          <p>Vencimentos, limites e prazos que merecem sua atenção.</p>
        </div>
        {unread > 0 && <button className="secondary-button" onClick={onReadAll}><CheckCheck size={17} /> Marcar todos como lidos</button>}
      </div>

      {items.length === 0 ? (
        <div className="empty-state alerts-empty"><Bell size={38} /><h2>Tudo em dia</h2><p>Nenhum aviso financeiro precisa da sua atenção agora.</p></div>
      ) : (
        <div className="alerts-list" role="list" aria-label="Avisos financeiros">
          {items.map((item) => {
            const Icon = icons[item.kind];
            const isRead = readIds.includes(item.id);
            return (
              <article className={`alert-card alert-${item.severity.toLowerCase()} ${isRead ? "is-read" : ""}`} key={item.id} role="listitem">
                <span className="alert-card-icon"><Icon size={21} /></span>
                <div className="alert-card-body">
                  <div className="alert-card-title"><strong>{item.title}</strong>{!isRead && <span className="unread-dot">Novo</span>}</div>
                  <p>{item.message}</p>
                </div>
                <button className="alert-open" onClick={() => onOpen(item)}>Ver detalhes <ChevronRight size={16} /></button>
                <button className="icon-button" onClick={() => onDismiss(item.id)} aria-label={`Dispensar aviso: ${item.title}`} title="Dispensar"><Trash2 size={17} /></button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
