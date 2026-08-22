import { ArrowDownRight, ArrowUpRight, CalendarDays, Plus, ReceiptText, Wallet } from "lucide-react";
import { paymentMethodLabels, type Summary } from "../types";

interface Props { summary: Summary | null; month: string; onMonth: (month: string) => void; onNew: () => void }

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);

export function DashboardView({ summary, month, onMonth, onNew }: Props) {
  const [selectedYear, selectedMonth] = month.split("-");
  const cards = [
    { label: "Saldo do mês", value: summary?.balance ?? 0, icon: Wallet, tone: "balance" },
    { label: "Receitas", value: summary?.income ?? 0, icon: ArrowUpRight, tone: "income" },
    { label: "Despesas", value: summary?.expense ?? 0, icon: ArrowDownRight, tone: "expense" },
  ];

  return <section className="content-section">
    <div className="section-heading dashboard-heading">
      <div><p className="eyebrow">Visão geral</p><h1>Seu mês em um relance</h1><p className="muted">Acompanhe o que entrou, o que saiu e siga no controle.</p></div>
      <div className="heading-actions">
        <div className="month-selector" aria-label="Selecionar período">
          <CalendarDays size={17} />
          <select aria-label="Mês" value={selectedMonth} onChange={(event) => onMonth(`${selectedYear}-${event.target.value}`)}>
            {monthNames.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}
          </select>
          <select aria-label="Ano" value={selectedYear} onChange={(event) => onMonth(`${event.target.value}-${selectedMonth}`)}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <button className="primary-button compact" onClick={onNew}><Plus size={18} /> Novo lançamento</button>
      </div>
    </div>
    <div className="summary-grid">{cards.map(({ label, value, icon: Icon, tone }) => <article className={`summary-card ${tone}`} key={label}><div><p>{label}</p><strong>{currency.format(value)}</strong></div><span><Icon /></span></article>)}</div>
    <div className="dashboard-grid">
      <article className="panel insight-panel"><div><p className="eyebrow">Balanço mensal</p><h2>{summary?.balance && summary.balance >= 0 ? "Você fechou no positivo" : "Atenção ao seu balanço"}</h2><p className="muted">{summary?.transactionCount ?? 0} lançamentos registrados neste mês.</p></div><div className="balance-visual"><span style={{ width: `${summary?.income ? Math.min(100, (summary.expense / summary.income) * 100) : 0}%` }} /><small>Despesas representam {summary?.income ? Math.round((summary.expense / summary.income) * 100) : 0}% das receitas</small></div></article>
      <article className="panel recent-panel"><div className="panel-title"><div><p className="eyebrow">Atividade</p><h2>Últimos lançamentos</h2></div><ReceiptText /></div>
        <div className="recent-list">{summary?.recent.map((item) => <div className="recent-item" key={item.id}><i style={{ background: item.category.color }} /><div><strong>{item.description}</strong><span>{item.category.name}{item.paymentMethod ? ` · ${paymentMethodLabels[item.paymentMethod]}` : ""}{item.cardName ? ` · ${item.cardName}` : ""} · {new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span></div><b className={item.type === "INCOME" ? "money income" : "money expense"}>{item.type === "INCOME" ? "+" : "−"}{currency.format(Number(item.amount))}</b></div>)}{!summary?.recent.length && <div className="empty-state mini"><p>Seu mês ainda está em branco.</p></div>}</div>
      </article>
    </div>
  </section>;
}
