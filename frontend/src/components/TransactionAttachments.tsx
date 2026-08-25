import { Download, FileImage, FileText, Paperclip, Trash2, Upload, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { api, apiFile } from "../lib/api";
import type { Transaction, TransactionAttachment } from "../types";

interface Props { transaction: Transaction; onClose: () => void; onChanged: () => void; }
const sizeLabel = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
export function TransactionAttachments({ transaction, onClose, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(transaction.attachments ?? []), [loading, setLoading] = useState(false), [error, setError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setLoading(true); setError("");
    try { const form = new FormData(); form.append("file", file); const attachment = await api<TransactionAttachment>(`/transactions/${transaction.id}/attachments`, { method: "POST", body: form }); setItems((current) => [attachment, ...current]); onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível anexar o arquivo"); }
    finally { setLoading(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  async function download(item: TransactionAttachment) {
    try { const blob = await apiFile(`/transactions/${transaction.id}/attachments/${item.id}`), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = item.originalName; link.click(); URL.revokeObjectURL(url); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível baixar o arquivo"); }
  }
  async function remove(item: TransactionAttachment) { if (!confirm(`Remover “${item.originalName}”?`)) return; try { await api(`/transactions/${transaction.id}/attachments/${item.id}`, { method: "DELETE" }); setItems((current) => current.filter((attachment) => attachment.id !== item.id)); onChanged(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível remover o arquivo"); } }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card attachment-modal"><div className="modal-header"><div><p className="eyebrow">Documentos</p><h2>Comprovantes</h2><span className="muted">{transaction.description}</span></div><button className="icon-button" onClick={onClose}><X /></button></div><div className="attachment-upload"><input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} hidden /><button className="primary-button" disabled={loading || items.length >= 5} onClick={() => inputRef.current?.click()}><Upload size={17} />{loading ? "Enviando..." : "Adicionar comprovante"}</button><small>PDF, JPG, PNG ou WEBP · até 5 MB · máximo de 5 arquivos</small></div>{error && <div className="form-error spaced">{error}</div>}<div className="attachment-list">{items.map((item) => <article key={item.id}><span>{item.mimeType === "application/pdf" ? <FileText /> : <FileImage />}</span><div><strong>{item.originalName}</strong><small>{sizeLabel(item.size)} · enviado em {new Date(item.createdAt).toLocaleDateString("pt-BR")}</small></div><button className="icon-button" onClick={() => void download(item)} title="Baixar"><Download size={17} /></button><button className="icon-button danger" onClick={() => void remove(item)} title="Remover"><Trash2 size={17} /></button></article>)}</div>{!items.length && <div className="empty-state mini"><Paperclip /><p>Nenhum comprovante anexado.</p></div>}</section></div>;
}
