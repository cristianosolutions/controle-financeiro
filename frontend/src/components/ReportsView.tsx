import { useMemo, useState } from "react";
import { Download, FileBarChart, Printer } from "lucide-react";
import { api } from "../lib/api";
import {
  paymentMethodLabels,
  type Category,
  type FinancialReport,
  type TransactionType,
  type User,
} from "../types";

interface Props {
  categories: Category[];
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

export function ReportsView({ categories, user }: Props) {
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(today);
  const [type, setType] = useState<"" | TransactionType>("");
  const [categoryId, setCategoryId] = useState("");
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setStatus("Consultando suas movimentações...");
    setReport(null);
    try {
      const params = new URLSearchParams({
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      });
      if (type) params.set("type", type);
      if (categoryId) params.set("categoryId", categoryId);
      const data = await api<FinancialReport>(`/reports/financial?${params}`);
      setReport(data);
      setStatus(
        data.totals.count
          ? `Relatório gerado com sucesso: ${data.totals.count} ${data.totals.count === 1 ? "lançamento encontrado" : "lançamentos encontrados"}.`
          : "Consulta concluída: nenhum lançamento foi encontrado com os filtros informados.",
      );
    } catch (reason) {
      setStatus("");
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
        "Forma de pagamento",
        "Cartão",
        "Valor (R$)",
        "Observação",
      ],
      ...report.items.map((item) => [
        new Date(item.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
        item.description,
        item.type === "INCOME" ? "Receita" : "Despesa",
        item.category.name,
        item.paymentMethod ? paymentMethodLabels[item.paymentMethod] : "",
        item.cardName ?? "",
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
        <button className="primary-button compact" disabled={loading}>
          {loading ? "Gerando..." : "Gerar relatório"}
        </button>
      </form>
      {error && <div className="form-error spaced">{error}</div>}
      {status && (
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
          <span>{status}</span>
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
                            {item.cardName ? ` · ${item.cardName}` : ""}
                          </small>
                        </span>
                        <span>
                          {item.type === "INCOME" ? "Receita" : "Despesa"}
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
