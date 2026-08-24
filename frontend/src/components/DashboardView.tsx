import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { paymentMethodLabels, type Summary } from "../types";

interface Props {
  summary: Summary | null;
  month: string;
  onMonth: (month: string) => void;
  onNew: () => void;
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);

function variation(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function TrendChart({ data }: { data: Summary["trend"] }) {
  const width = 720;
  const height = 220;
  const plotTop = 18;
  const plotBottom = 176;
  const maxValue = Math.max(...data.flatMap((item) => [item.income, item.expense]), 1);
  const point = (value: number, index: number) => {
    const x = 18 + (index / Math.max(data.length - 1, 1)) * (width - 36);
    const y = plotBottom - (value / maxValue) * (plotBottom - plotTop);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const incomePoints = data.map((item, index) => point(item.income, index)).join(" ");
  const expensePoints = data.map((item, index) => point(item.expense, index)).join(" ");
  const labels = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter(
    (value, index, values) => values.indexOf(value) === index && value >= 0,
  );

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução diária de receitas e despesas">
        <defs>
          <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = plotTop + (line / 3) * (plotBottom - plotTop);
          return <line className="chart-grid-line" key={line} x1="18" x2={width - 18} y1={y} y2={y} />;
        })}
        {data.length > 0 && (
          <polygon
            className="chart-area"
            points={`18,${plotBottom} ${incomePoints} ${width - 18},${plotBottom}`}
          />
        )}
        <polyline className="chart-line income-line" points={incomePoints} />
        <polyline className="chart-line expense-line" points={expensePoints} />
        {labels.map((index) => {
          const x = 18 + (index / Math.max(data.length - 1, 1)) * (width - 36);
          return (
            <text className="chart-axis-label" key={index} x={x} y="208" textAnchor="middle">
              Dia {data[index]?.day}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function DashboardView({ summary, month, onMonth, onNew }: Props) {
  const [selectedYear, selectedMonth] = month.split("-");
  const current = summary ?? {
    income: 0,
    expense: 0,
    balance: 0,
    transactionCount: 0,
    previousMonth: { income: 0, expense: 0, balance: 0 },
    trend: [],
    expenseCategories: [],
    recent: [],
  };
  const cards = [
    {
      label: "Saldo do mês",
      value: current.balance,
      previous: current.previousMonth.balance,
      icon: Wallet,
      tone: "balance",
    },
    {
      label: "Receitas",
      value: current.income,
      previous: current.previousMonth.income,
      icon: ArrowUpRight,
      tone: "income",
    },
    {
      label: "Despesas",
      value: current.expense,
      previous: current.previousMonth.expense,
      icon: ArrowDownRight,
      tone: "expense",
    },
  ];
  const expenseRatio = current.income
    ? Math.round((current.expense / current.income) * 100)
    : current.expense
      ? 100
      : 0;
  const maxCategory = Math.max(...current.expenseCategories.map((item) => item.total), 1);

  return (
    <section className="content-section dashboard-section">
      <div className="section-heading dashboard-heading">
        <div>
          <p className="eyebrow">Painel financeiro</p>
          <h1>Visão geral</h1>
          <p className="muted">Indicadores essenciais para decisões mais seguras.</p>
        </div>
        <div className="heading-actions">
          <div className="month-selector" aria-label="Selecionar período">
            <CalendarDays size={17} />
            <select
              aria-label="Mês"
              value={selectedMonth}
              onChange={(event) => onMonth(`${selectedYear}-${event.target.value}`)}
            >
              {monthNames.map((name, index) => (
                <option key={name} value={String(index + 1).padStart(2, "0")}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label="Ano"
              value={selectedYear}
              onChange={(event) => onMonth(`${event.target.value}-${selectedMonth}`)}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <button className="primary-button compact" onClick={onNew}>
            <Plus size={18} /> Novo lançamento
          </button>
        </div>
      </div>

      <div className="summary-grid dashboard-summary-grid">
        {cards.map(({ label, value, previous, icon: Icon, tone }) => {
          const change = variation(value, previous);
          const favorable = tone === "expense" ? change <= 0 : change >= 0;
          return (
            <article className={`summary-card ${tone}`} key={label}>
              <div className="summary-card-main">
                <div>
                  <p>{label}</p>
                  <strong>{currency.format(value)}</strong>
                </div>
                <span className="summary-icon"><Icon /></span>
              </div>
              <div className="summary-comparison">
                <span className={favorable ? "positive" : "negative"}>
                  {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(change)}%
                </span>
                <small>em relação ao mês anterior</small>
              </div>
            </article>
          );
        })}
        <article className="summary-card activity-card">
          <div className="summary-card-main">
            <div>
              <p>Movimentações</p>
              <strong>{current.transactionCount}</strong>
            </div>
            <span className="summary-icon"><Activity /></span>
          </div>
          <div className="summary-comparison neutral">
            <small>lançamentos no período selecionado</small>
          </div>
        </article>
      </div>

      <div className="analytics-grid">
        <article className="panel trend-panel">
          <div className="panel-title dashboard-panel-title">
            <div>
              <p className="eyebrow">Fluxo do mês</p>
              <h2>Evolução financeira</h2>
            </div>
            <div className="chart-legend">
              <span><i className="income-dot" /> Receitas</span>
              <span><i className="expense-dot" /> Despesas</span>
            </div>
          </div>
          <TrendChart data={current.trend} />
          <div className="chart-footer">
            <span>Maior movimentação diária</span>
            <strong>
              {compactCurrency.format(
                Math.max(...current.trend.flatMap((item) => [item.income, item.expense]), 0),
              )}
            </strong>
          </div>
        </article>

        <article className="panel category-chart-panel">
          <div className="panel-title dashboard-panel-title">
            <div>
              <p className="eyebrow">Distribuição</p>
              <h2>Despesas por categoria</h2>
            </div>
            <span className="expense-total">{currency.format(current.expense)}</span>
          </div>
          <div className="category-chart-list">
            {current.expenseCategories.slice(0, 5).map((item) => (
              <div className="category-chart-row" key={item.id}>
                <div className="category-chart-meta">
                  <span><i style={{ background: item.color }} />{item.name}</span>
                  <strong>{currency.format(item.total)}</strong>
                </div>
                <div className="category-chart-track">
                  <span
                    style={{
                      width: `${(item.total / maxCategory) * 100}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
            {!current.expenseCategories.length && (
              <div className="empty-state chart-empty">Nenhuma despesa neste período.</div>
            )}
          </div>
        </article>
      </div>

      <div className="dashboard-grid professional-dashboard-grid">
        <article className="panel insight-panel professional-insight">
          <div>
            <p className="eyebrow">Saúde financeira</p>
            <h2>{current.balance >= 0 ? "Seu mês está no positivo" : "Suas despesas superaram as receitas"}</h2>
            <p className="muted">
              {current.balance >= 0
                ? `Você preservou ${currency.format(current.balance)} neste período.`
                : `O déficit atual é de ${currency.format(Math.abs(current.balance))}.`}
            </p>
          </div>
          <div className="balance-visual professional-balance">
            <div><span>Comprometimento da receita</span><strong>{expenseRatio}%</strong></div>
            <div className="balance-track">
              <span style={{ width: `${Math.min(expenseRatio, 100)}%` }} />
            </div>
            <small>{expenseRatio <= 70 ? "Há margem para poupar e planejar." : "Considere revisar as maiores categorias de despesa."}</small>
          </div>
        </article>

        <article className="panel recent-panel">
          <div className="panel-title">
            <div><p className="eyebrow">Atividade recente</p><h2>Últimos lançamentos</h2></div>
            <ReceiptText />
          </div>
          <div className="recent-list">
            {current.recent.map((item) => (
              <div className="recent-item" key={item.id}>
                <i style={{ background: item.category.color }} />
                <div>
                  <strong>{item.description}</strong>
                  <span>
                    {item.category.name}
                    {item.paymentMethod ? ` · ${paymentMethodLabels[item.paymentMethod]}` : ""}
                    {item.cardName ? ` · ${item.cardName}` : ""} ·{" "}
                    {new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </span>
                </div>
                <b className={item.type === "INCOME" ? "money income" : "money expense"}>
                  {item.type === "INCOME" ? "+" : "−"}{currency.format(Number(item.amount))}
                </b>
              </div>
            ))}
            {!current.recent.length && (
              <div className="empty-state mini"><p>Seu mês ainda está em branco.</p></div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
