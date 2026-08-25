import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { api } from "../lib/api";
import { transactionRowsFromCsv, type CsvTransactionRow } from "../lib/csv";
import type { ImportPreview } from "../types";

interface Props { onImported: () => void; }
const template = '\uFEFF"Data";"Descrição";"Tipo";"Categoria";"Conta";"Forma de pagamento";"Cartão";"Situação";"Valor (R$)";"Observação"\r\n"25/08/2026";"Exemplo de mercado";"Despesa";"Alimentação";"Conta principal";"Pix";"";"Pago";"50,00";"Linha de exemplo — remova antes de importar"';

export function ImportView({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvTransactionRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setSuccess(""); setPreview(null);
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Selecione um arquivo no formato CSV."); return; }
    if (file.size > 2_000_000) { setError("O arquivo deve ter no máximo 2 MB."); return; }
    try {
      const parsed = transactionRowsFromCsv(await file.text());
      if (!parsed.length) throw new Error("O arquivo não possui lançamentos.");
      if (parsed.length > 2_000) throw new Error("Importe no máximo 2.000 lançamentos por arquivo.");
      setRows(parsed); setFileName(file.name); setLoading(true);
      setPreview(await api<ImportPreview>("/imports/transactions/preview", { method: "POST", body: JSON.stringify({ rows: parsed, fileName: file.name }) }));
    } catch (reason) { setRows([]); setFileName(""); setError(reason instanceof Error ? reason.message : "Não foi possível ler o arquivo"); }
    finally { setLoading(false); }
  }
  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([template], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "modelo-importacao-control-finance.csv"; link.click(); URL.revokeObjectURL(url);
  }
  async function commit() {
    if (!preview?.summary.valid) return;
    setLoading(true); setError("");
    try {
      const result = await api<{ imported: number; skipped: number }>("/imports/transactions/commit", { method: "POST", body: JSON.stringify({ rows, fileName }) });
      setSuccess(`${result.imported} ${result.imported === 1 ? "lançamento importado" : "lançamentos importados"} com sucesso.${result.skipped ? ` ${result.skipped} linha(s) ignorada(s).` : ""}`);
      setRows([]); setPreview(null); setFileName(""); if (inputRef.current) inputRef.current.value = ""; onImported();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível concluir a importação"); }
    finally { setLoading(false); }
  }
  return <section className="content-section import-section">
    <div className="section-heading"><div><p className="eyebrow">Entrada de dados</p><h1>Importar lançamentos</h1><p className="muted">Traga seu histórico em CSV com conferência completa antes de salvar.</p></div><button className="secondary-button compact" onClick={downloadTemplate}><Download size={16} /> Baixar modelo CSV</button></div>
    <article className="import-guide"><FileSpreadsheet /><div><h2>Como preparar o arquivo</h2><p>Use o modelo ou o CSV exportado nos relatórios. Os nomes de categoria, conta e cartão precisam ser iguais aos cadastrados no sistema.</p><span>Limite: 2.000 linhas e 2 MB por arquivo.</span></div></article>
    <div className={`import-dropzone ${loading ? "loading" : ""}`} onClick={() => !loading && inputRef.current?.click()}><input ref={inputRef} type="file" accept=".csv,text/csv" onChange={(event) => void selectFile(event)} hidden /><Upload /><strong>{loading ? "Analisando o arquivo..." : "Selecionar arquivo CSV"}</strong><span>{fileName || "Clique aqui para escolher o arquivo"}</span></div>
    {error && <div className="form-error spaced">{error}</div>}
    {success && <div className="import-success"><CheckCircle2 /><span>{success}</span></div>}
    {preview && <><div className="import-summary"><div><small>Linhas</small><strong>{preview.summary.total}</strong></div><div className="valid"><small>Prontas</small><strong>{preview.summary.valid}</strong></div><div className="invalid"><small>Com erros</small><strong>{preview.summary.invalid}</strong></div><div className="duplicate"><small>Duplicadas</small><strong>{preview.summary.duplicates}</strong></div></div>
      <div className="import-review"><div className="import-review-heading"><div><p className="eyebrow">Pré-visualização</p><h2>Conferência das linhas</h2></div><button className="primary-button compact" disabled={loading || preview.summary.valid === 0} onClick={() => void commit()}>{loading ? "Importando..." : `Importar ${preview.summary.valid} válida(s)`}</button></div><div className="table-scroll"><table className="import-table"><thead><tr><th>Linha</th><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Resultado</th></tr></thead><tbody>{preview.rows.map((item) => <tr key={item.raw.rowNumber} className={item.errors.length ? "invalid" : item.duplicate ? "duplicate" : "valid"}><td>{item.raw.rowNumber}</td><td>{item.raw.date}</td><td><strong>{item.raw.description}</strong><small>{item.raw.type}{item.raw.account ? ` · ${item.raw.account}` : ""}{item.raw.card ? ` · ${item.raw.card}` : ""}</small></td><td>{item.raw.category}</td><td>{item.raw.amount}</td><td>{item.errors.length ? <span className="import-row-message error"><XCircle />{item.errors.join("; ")}</span> : item.duplicate ? <span className="import-row-message warning"><AlertTriangle />Duplicada — será ignorada</span> : <span className="import-row-message success"><CheckCircle2 />Pronta para importar</span>}</td></tr>)}</tbody></table></div></div>
    </>}
  </section>;
}
