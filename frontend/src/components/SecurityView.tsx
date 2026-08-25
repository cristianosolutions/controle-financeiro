import { KeyRound, Laptop, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import type { AuthSession } from "../types";

interface Props { onLogout: () => void; }
export function SecurityView({ onLogout }: Props) {
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => { try { setSessions(await api<AuthSession[]>("/auth/sessions")); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as sessões"); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form).entries());
    if (data.newPassword !== data.confirmPassword) { setError("A confirmação da nova senha não confere."); setLoading(false); return; }
    try { await api("/auth/password", { method: "PUT", body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }) }); form.reset(); setNotice("Senha alterada. As outras sessões foram desconectadas."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível alterar a senha"); }
    finally { setLoading(false); }
  }
  async function revoke(session: AuthSession) {
    if (!confirm(session.current ? "Encerrar esta sessão e sair agora?" : `Desconectar ${session.description}?`)) return;
    try { await api(`/auth/sessions/${session.id}`, { method: "DELETE" }); if (session.current) onLogout(); else { setNotice("Dispositivo desconectado."); await load(); } }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível encerrar a sessão"); }
  }
  return <section className="content-section security-section"><div className="section-heading"><div><p className="eyebrow">Proteção da conta</p><h1>Segurança</h1><p className="muted">Controle sua senha e os dispositivos conectados à sua conta.</p></div><span className="security-heading-icon"><ShieldCheck /></span></div>
    {notice && <div className="admin-notice">{notice}</div>}{error && <div className="form-error spaced">{error}</div>}
    <div className="security-grid"><article className="panel security-password"><div className="panel-title"><div><p className="eyebrow">Credenciais</p><h2>Alterar senha</h2></div><KeyRound /></div><p className="muted">Use pelo menos 8 caracteres, com letra maiúscula, minúscula e número.</p><form onSubmit={changePassword}><label>Senha atual<input name="currentPassword" type="password" required autoComplete="current-password" /></label><label>Nova senha<input name="newPassword" type="password" minLength={8} maxLength={72} required autoComplete="new-password" /></label><label>Confirmar nova senha<input name="confirmPassword" type="password" minLength={8} maxLength={72} required autoComplete="new-password" /></label><button className="primary-button" disabled={loading}>{loading ? "Alterando..." : "Alterar senha"}</button></form></article>
      <article className="panel security-sessions"><div className="panel-title"><div><p className="eyebrow">Acessos ativos</p><h2>Dispositivos conectados</h2></div><Laptop /></div><div className="session-list">{sessions.map((session) => <div key={session.id}><span className="session-icon">{/Android|iOS/.test(session.description) ? <Smartphone /> : <Laptop />}</span><span><strong>{session.description}{session.current && <i>Esta sessão</i>}</strong><small>Último acesso: {new Date(session.lastUsedAt).toLocaleString("pt-BR")}{session.ipAddress ? ` · IP ${session.ipAddress}` : ""}</small><small>Expira em {new Date(session.expiresAt).toLocaleDateString("pt-BR")}</small></span><button className="secondary-button compact" onClick={() => void revoke(session)}><LogOut size={15} /> Sair</button></div>)}</div></article></div>
  </section>;
}
