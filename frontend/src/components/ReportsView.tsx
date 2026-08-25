import { useMemo, useState } from "react";
import { Download, FileBarChart, Printer, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { api } from "../lib/api";
import {
  paymentMethodLabels,
  transactionStatusLabels,
  type Category,
  type Account,
  type CreditCard,
  type FinancialReport,
  type PaymentMethod,
  type TransactionType,
  type TransactionStatus,
  type User,
} from "../types";

interface Props {
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  user: User;
}
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const today = new Date().toISOString().slice(0, 10);
const firstDay = `${today.slice(0, 7)}-01`;
const csvCell = (value: string | number) =>
  `"${String(value).replaceAll('"', '""')}"`;

function shortMonth(month: string) {
  return new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(".", "");
}

function ReportTrendChart({ data }: { data: FinancialReport["analytics"]["monthly"] }) {
  const maximum = Math.max(...data.flatMap((item) => [item.income, item.expense]), 1);
  return <div className="report-trend-chart">{data.map((item) => <div key={item.month} className="report-trend-column"><div className="report-trend-bars"><i className="income-bar" style={{ height: `${Math.max(2, item.income / maximum * 100)}%` }} title={`Receitas: ${currency.format(item.income)}`} /><i className="expense-bar" style={{ height: `${Math.max(2, item.expense / maximum * 100)}%` }} title={`Despesas: ${currency.format(item.expense)}`} /></div><span>{shortMonth(item.month)}</span></div>)}</div>;
}

function NetWorthChart({ data }: { data: FinancialReport["analytics"]["netWorth"] }) {
  const width = 720, height = 210;
  const values = data.map((item) => item.netWorth);
  const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values), range = Math.max(maximum - minimum, 1);
  const x = (index: number) => 25 + index / Math.max(data.length - 1, 1) * (width - 50);
  const y = (value: number) => 18 + (maximum - value) / range * (height - 55);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  return <div className="net-worth-chart"><svg viewBox={`0 0 ${width} ${height}`}><line x1="20" x2={width - 20} y1={y(0)} y2={y(0)} /><polyline points={points} />{data.map((item, index) => <g key={item.month}><circle className={item.netWorth < 0 ? "negative" : ""} cx={x(index)} cy={y(item.netWorth)} r="5"><title>{currency.format(item.netWorth)}</title></circle><text x={x(index)} y={height - 5} textAnchor="middle">{shortMonth(item.month)}</text></g>)}</svg></div>;
}

export function ReportsView({ categories, accounts, cards, user }: Props) {
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(today);
  const [type, setType] = useState<"" | TransactionType>("");
  const [categoryId, setCategoryId] = useState("");
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | TransactionStatus>("");
  const [accountId, setAccountId] = useState("");
  const [cardId, setCardId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"" | PaymentMethod>("");

  async function generate() {
    setLoading(true);
    setError("");
    setNotice("Consultando suas movimentações...");
    setReport(null);
    try {
      const params = new URLSearchParams({
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      });
      if (type) params.set("type", type);
      if (categoryId) params.set("categoryId", categoryId);
      if (statusFilter) params.set("status", statusFilter);
      if (accountId) params.set("accountId", accountId);
      if (cardId) params.set("cardId", cardId);
      if (paymentMethod) params.set("paymentMethod", paymentMethod);
      const data = await api<FinancialReport>(`/reports/financial?${params}`);
      setReport(data);
      setNotice(
        data.totals.count
          ? `Relatório gerado com sucesso: ${data.totals.count} ${data.totals.count === 1 ? "lançamento encontrado" : "lançamentos encontrados"}.`
          : "Consulta concluída: nenhum lançamento foi encontrado com os filtros informados.",
      );
    } catch (reason) {
      setNotice("");
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível gerar o relatório",
      );
    } finally {
      setLoading(false);
    }
  }

  const maxCategory = useMemo(
    () => Math.max(...(report?.categories.map((item) => item.total) ?? [0]), 1),
    [report],
  );

  function exportCsv() {
    if (!report) {
      setError("Gere um relatório antes de baixar o arquivo CSV.");
      return;
    }
    const rows = [
      [
        "Data",
        "Descrição",
        "Tipo",
        "Categoria",
        "Conta",
        "Forma de pagamento",
        "Cartão",
        "Situação",
        "Valor (R$)",
        "Observação",
      ],
      ...report.items.map((item) => [
        new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
        item.description,
        item.type === "INCOME" ? "Receita" : "Despesa",
        item.category.name,
        item.account?.name ?? "",
        item.paymentMethod ? paymentMethodLabels[item.paymentMethod] : "",
        item.card?.name ?? "",
        transactionStatusLabels[item.effectiveStatus],
        Number(item.amount).toFixed(2).replace(".", ","),
        item.notes ?? "",
      ]),
    ];
    const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-financeiro-${from}-a-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function savePdf() {
    if (!report) {
      setError("Gere um relatório antes de salvar o arquivo em PDF.");
      return;
    }
    setError("");
    window.print();
  }

  return (
    <section className="content-section report-section">
      <div className="section-heading report-heading">
        <div>
          <p className="eyebrow">Análise financeira</p>
          <h1>Relatórios</h1>
          <p className="muted">
            Filtre, confira e exporte suas movimentações quando precisar.
          </p>
        </div>
        <div className="report-actions no-print">
          <button className="csv-button" disabled={loading} onClick={exportCsv}>
            <Download size={16} /> Baixar CSV
          </button>
          <button
            className="primary-button compact"
            disabled={loading}
            onClick={savePdf}
          >
            <Printer size={16} /> Salvar em PDF
          </button>
        </div>
      </div>
      <div className="report-document-meta print-only">
        <strong>Control Finance — Relatório financeiro</strong>
        <span>
          Responsável: {user.name} · Emitido em{" "}
          {new Date().toLocaleDateString("pt-BR")}
        </span>
      </div>
      <form
        className="report-filters no-print"
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
      >
        <label>
          Data inicial
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            required
          />
        </label>
        <label>
          Data final
          <input
            type="date"
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
            required
          />
        </label>
        <label>
          Tipo
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as "" | TransactionType);
              setCategoryId("");
            }}
          >
            <option value="">Todos</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
          </select>
        </label>
        <label>
          Categoria
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Todas</option>
            {categories
              .filter((item) => !type || !item.type || item.type === type)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Situação
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | TransactionStatus)}>
            <option value="">Ativos</option>
            <option value="PENDING">Previstos</option>
            <option value="OVERDUE">Atrasados</option>
            <option value="PAID">Pagos</option>
            <option value="RECEIVED">Recebidos</option>
            <option value="CANCELED">Cancelados</option>
          </select>
        </label>
        <label>
          Conta
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Todas</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label>
          Pagamento
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "" | PaymentMethod)}>
            <option value="">Todos</option>
            {Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Cartão
          <select value={cardId} onChange={(event) => setCardId(event.target.value)}>
            <option value="">Todos</option>
            {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
        </label>
        <button className="primary-button compact" disabled={loading}>
          {loading ? "Gerando..." : "Gerar relatório"}
        </button>
      </form>
      {error && <div className="form-error spaced">{error}</div>}
      {notice && (
        <div
          className={`report-status no-print ${loading ? "loading" : report?.totals.count ? "success" : "empty"}`}
          role="status"
          aria-live="polite"
        >
          <strong>
            {loading
              ? "Gerando relatório"
              : report?.totals.count
                ? "Relatório pronto"
                : "Nenhum resultado"}
          </strong>
          <span>{notice}</span>
        </div>
      )}
      {report && (
        <>
          <div className="report-print-content">
            <p className="report-period">
              Período de{" "}
              <strong>
                {new Date(report.period.from).toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                })}
              </strong>{" "}
              a{" "}
              <strong>
                {new Date(report.period.to).toLocaleDateString("pt-BR", {
                  timeZone: "UTC",
                })}
              </strong>
            </p>
            <div className="report-summary">
              <article>
                <span>Receitas</span>
                <strong className="money income">
                  {currency.format(report.totals.income)}
                </strong>
              </article>
              <article>
                <span>Despesas</span>
                <strong className="money expense">
                  {currency.format(report.totals.expense)}
                </strong>
              </article>
              <article>
                <span>Saldo</span>
                <strong
                  className={
                    report.totals.balance >= 0
                      ? "money income"
                      : "money expense"
                  }
                >
                  {currency.format(report.totals.balance)}
                </strong>
              </article>
              <article>
                <span>Lançamentos</span>
                <strong>{report.totals.count}</strong>
              </article>
            </div>
            <div className="report-comparison no-print">
              <div><span>Comparação com o período anterior</span><small>{new Date(report.comparison.period.from).toLocaleDateString("pt-BR", { timeZone: "UTC" })} a {new Date(report.comparison.period.to).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</small></div>
              <div className={report.comparison.change.income >= 0 ? "positive" : "negative"}>{report.comparison.change.income >= 0 ? <TrendingUp /> : <TrendingDown />}<span>Receitas<strong>{Math.abs(Math.round(report.comparison.change.income))}%</strong></span></div>
              <div className={report.comparison.change.expense <= 0 ? "positive" : "negative"}>{report.comparison.change.expense <= 0 ? <TrendingDown /> : <TrendingUp />}<span>Despesas<strong>{Math.abs(Math.round(report.comparison.change.expense))}%</strong></span></div>
              <div className={report.comparison.change.balance >= 0 ? "positive" : "negative"}>{report.comparison.change.balance >= 0 ? <TrendingUp /> : <TrendingDown />}<span>Saldo<strong>{Math.abs(Math.round(report.comparison.change.balance))}%</strong></span></div>
            </div>
            <div className="advanced-report-grid">
              <article className="panel report-chart-panel"><div className="panel-title"><div><p className="eyebrow">Comparativo mensal</p><h2>Receitas e despesas</h2></div><div className="chart-legend"><span><i className="income-dot" /> Receitas</span><span><i className="expense-dot" /> Despesas</span></div></div><ReportTrendChart data={report.analytics.monthly} /></article>
              <article className="panel report-chart-panel"><div className="panel-title"><div><p className="eyebrow">Patrimônio líquido</p><h2>Evolução patrimonial</h2></div><WalletCards /></div><NetWorthChart data={report.analytics.netWorth} /><div className="net-worth-breakdown">{report.analytics.netWorth.length > 0 && <><span>Disponível <strong>{currency.format(report.analytics.netWorth.at(-1)!.liquidBalance)}</strong></span><span>Metas <strong>{currency.format(report.analytics.netWorth.at(-1)!.goalSavings)}</strong></span><span>Dívidas de cartão <strong className="money expense">{currency.format(report.analytics.netWorth.at(-1)!.cardDebt)}</strong></span></>}</div></article>
            </div>
            <div className="report-source-grid">
              <article className="panel"><p className="eyebrow">Origem</p><h2>Por conta</h2><div className="report-source-list">{report.analytics.accounts.map((item) => <div key={item.id}><i style={{ background: item.color }} /><span><strong>{item.name}</strong><small>{item.count} lançamento(s)</small></span><b>{currency.format(item.total)}</b></div>)}{!report.analytics.accounts.length && <p className="muted">Nenhuma conta no resultado.</p>}</div></article>
              <article className="panel"><p className="eyebrow">Meios utilizados</p><h2>Por pagamento</h2><div className="report-source-list">{report.analytics.paymentMethods.map((item) => <div key={item.id}><i /><span><strong>{paymentMethodLabels[item.id]}</strong><small>{item.count} lançamento(s)</small></span><b>{currency.format(item.total)}</b></div>)}{!report.analytics.paymentMethods.length && <p className="muted">Nenhuma forma de pagamento.</p>}</div></article>
              <article className="panel"><p className="eyebrow">Crédito</p><h2>Por cartão</h2><div className="report-source-list">{report.analytics.cards.map((item) => <div key={item.id}><i style={{ background: item.color }} /><span><strong>{item.name}</strong><small>{item.count} compra(s)</small></span><b>{currency.format(item.total)}</b></div>)}{!report.analytics.cards.length && <p className="muted">Nenhum cartão no resultado.</p>}</div></article>
            </div>
            <div className="report-grid">
              <article className="panel report-categories">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">Distribuição</p>
                    <h2>Por categoria</h2>
                  </div>
                  <FileBarChart />
                </div>
                <div>
                  {report.categories.map((item) => (
                    <div className="category-report-row" key={item.id}>
                      <div>
                        <i style={{ background: item.color }} />
                        <strong>{item.name}</strong>
                        <span>
                          {item.count}{" "}
                          {item.count === 1 ? "lançamento" : "lançamentos"}
                        </span>
                        <b>{currency.format(item.total)}</b>
                      </div>
                      <span>
                        <i
                          style={{
                            width: `${(item.total / maxCategory) * 100}%`,
                            background: item.color,
                          }}
                        />
                      </span>
                    </div>
                  ))}
                  {!report.categories.length && (
                    <div className="empty-state mini">
                      Nenhum dado no período.
                    </div>
                  )}
                </div>
              </article>
              <article className="panel report-details">
                <p className="eyebrow">Detalhamento</p>
                <h2>Movimentações do período</h2>
                {report.items.length ? (
                  <div className="report-table">
                    <div className="report-table-row report-table-head">
                      <span>Data</span>
                      <span>Descrição / categoria</span>
                      <span>Tipo</span>
                      <span>Valor</span>
                    </div>
                    {report.items.map((item) => (
                      <div className="report-table-row" key={item.id}>
                        <span>
                          {new Date(item.date).toLocaleDateString("pt-BR", {
                            timeZone: "UTC",
                          })}
                        </span>
                        <span>
                          <strong>{item.description}</strong>
                          <small>
                            {item.category.name}
                            {item.paymentMethod
                              ? ` · ${paymentMethodLabels[item.paymentMethod]}`
                              : ""}
                            {item.card ? ` · ${item.card.name}` : ""}
                          </small>
                        </span>
                        <span>
                          {item.type === "INCOME" ? "Receita" : "Despesa"}
                          <small>{transactionStatusLabels[item.effectiveStatus]}</small>
                        </span>
                        <strong
                          className={
                            item.type === "INCOME"
                              ? "money income"
                              : "money expense"
                          }
                        >
                          {currency.format(Number(item.amount))}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state report-empty">
                    <FileBarChart />
                    <h3>Nenhuma movimentação encontrada</h3>
                    <p>
                      Altere o período, o tipo ou a categoria e tente novamente.
                    </p>
                  </div>
                )}
              </article>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
