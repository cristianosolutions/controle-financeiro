import { AlertTriangle, CalendarRange, CreditCard, RefreshCw, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { FinancialForecast } from "../types";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactCurrency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const currentMonth = new Date().toISOString().slice(0, 7);

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(".", "");
}

function ForecastChart({ forecast }: { forecast: FinancialForecast }) {
  const width = 760;
  const height = 250;
  const values = [forecast.openingBalance, ...forecast.months.map((item) => item.cumulativeBalance)];
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = Math.max(maximum - minimum, 1);
  const x = (index: number) => 30 + (index / Math.max(values.length - 1, 1)) * (width - 60);
  const y = (value: number) => 20 + ((maximum - value) / range) * (height - 64);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const zeroY = y(0);
  return <div className="forecast-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do saldo projetado"><line className="forecast-zero" x1="20" x2={width - 20} y1={zeroY} y2={zeroY} /><polyline className="forecast-line" points={points} />{values.map((value, index) => <circle key={index} className={value < 0 ? "negative" : ""} cx={x(index)} cy={y(value)} r="5"><title>{currency.format(value)}</title></circle>)}{forecast.months.map((item, index) => <text key={item.month} x={x(index + 1)} y={height - 8} textAnchor="middle">{monthLabel(item.month)}</text>)}</svg></div>;
}

export function ForecastView() {
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [horizon, setHorizon] = useState(6);
  const [forecast, setForecast] = useState<FinancialForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setForecast(await api<FinancialForecast>(`/forecasts?startMonth=${startMonth}&months=${horizon}`)); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível calcular a previsão"); }
    finally { setLoading(false); }
  }, [startMonth, horizon]);
  useEffect(() => { void load(); }, [load]);

  return <section className="content-section forecast-section">
    <div className="section-heading"><div><p className="eyebrow">Planejamento futuro</p><h1>Previsão financeira</h1><p className="muted">Antecipe seu saldo usando pendências, recorrências, parcelas e faturas cadastradas.</p></div><div className="forecast-controls"><label>Início<input type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} /></label><label>Horizonte<select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={24}>24 meses</option></select></label><button className="secondary-button compact" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Atualizar</button></div></div>
    {error && <div className="form-error spaced">{error}</div>}
    {loading && !forecast ? <div className="empty-state"><RefreshCw className="spin" /><p>Calculando sua previsão...</p></div> : forecast && <>
      {forecast.alerts.length > 0 && <div className="forecast-warning"><AlertTriangle /><div><strong>Atenção ao saldo futuro</strong><span>O saldo pode ficar negativo a partir de {monthLabel(forecast.alerts[0]!.month)} ({currency.format(forecast.alerts[0]!.amount)}).</span></div></div>}
      <div className="forecast-summary"><article><span><Wallet /></span><small>Saldo atual</small><strong>{currency.format(forecast.openingBalance)}</strong></article><article><span className="income"><TrendingUp /></span><small>Receitas previstas</small><strong className="money income">{currency.format(forecast.totalIncome)}</strong></article><article><span className="expense"><TrendingDown /></span><small>Despesas previstas</small><strong className="money expense">{currency.format(forecast.totalExpense)}</strong></article><article><span><CalendarRange /></span><small>Saldo ao final</small><strong className={forecast.finalBalance >= 0 ? "money income" : "money expense"}>{currency.format(forecast.finalBalance)}</strong></article></div>
      <article className="panel forecast-chart-panel"><div className="panel-title"><div><p className="eyebrow">Projeção acumulada</p><h2>Evolução do saldo</h2></div><strong>{compactCurrency.format(forecast.finalBalance)}</strong></div><ForecastChart forecast={forecast} /></article>
      <article className="panel forecast-table-panel"><div className="panel-title"><div><p className="eyebrow">Detalhamento</p><h2>Fluxo previsto por mês</h2></div></div><div className="table-scroll"><table className="forecast-table"><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Faturas</th><th>Resultado</th><th>Saldo projetado</th></tr></thead><tbody>{forecast.months.map((item) => <tr key={item.month}><td><strong>{monthLabel(item.month)}</strong><small>{item.pendingCount} pendência(s){item.invoiceCount > 0 ? ` · ${item.invoiceCount} fatura(s)` : ""}</small></td><td className="money income">{currency.format(item.income)}</td><td className="money expense">{currency.format(item.expense)}</td><td><span className="invoice-value"><CreditCard size={14} />{currency.format(item.cardInvoices)}</span></td><td className={item.net >= 0 ? "money income" : "money expense"}>{currency.format(item.net)}</td><td className={item.cumulativeBalance >= 0 ? "money income" : "money expense"}><strong>{currency.format(item.cumulativeBalance)}</strong></td></tr>)}</tbody></table></div></article>
      <p className="forecast-note">Estimativa baseada somente nos dados cadastrados. Alterações em datas, valores, status e faturas recalculam automaticamente a projeção.</p>
    </>}
  </section>;
}
