import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { api } from "../lib/api";
import type { AdminUser, User } from "../types";

interface Props { currentUser: User }

export function AdminUsersView({ currentUser }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<"new" | AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try { setUsers(await api<AdminUser[]>("/admin/users")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar os usuários"); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (editing === "new") {
        await api("/admin/users", { method: "POST", body: JSON.stringify({ ...data, isActive: true }) });
        setNotice("Usuário criado com sucesso.");
      } else if (editing) {
        await api(`/admin/users/${editing.id}`, { method: "PUT", body: JSON.stringify({ name: data.name, email: data.email, role: data.role ?? editing.role, isActive: data.isActive ? data.isActive === "true" : editing.isActive }) });
        if (data.password) await api(`/admin/users/${editing.id}/password`, { method: "PUT", body: JSON.stringify({ password: data.password }) });
        setNotice("Usuário atualizado com sucesso.");
      }
      setEditing(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o usuário"); }
    finally { setLoading(false); }
  }

  async function remove(user: AdminUser) {
    if (!confirm(`Excluir ${user.name}? Todos os lançamentos e categorias dessa conta também serão removidos permanentemente.`)) return;
    try { await api(`/admin/users/${user.id}`, { method: "DELETE" }); setNotice("Usuário excluído."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível excluir o usuário"); }
  }

  return <section className="content-section admin-users-section">
    <div className="section-heading"><div><p className="eyebrow">Administração</p><h1>Usuários</h1><p className="muted">Gerencie acessos, perfis e senhas do sistema.</p></div><button className="primary-button compact" onClick={() => { setEditing("new"); setError(""); }}><Plus size={18} /> Novo usuário</button></div>
    {notice && <div className="admin-notice" role="status">{notice}</div>}{error && <div className="form-error spaced">{error}</div>}
    <div className="users-table-card"><div className="users-table users-table-head"><span>Usuário</span><span>Perfil</span><span>Status</span><span>Lançamentos</span><span /></div>{users.map((user) => <div className="users-table" key={user.id}><span className="admin-user-name"><i>{user.name.slice(0, 2).toUpperCase()}</i><span><strong>{user.name}</strong><small>{user.email}</small></span></span><span className={user.role === "ADMIN" ? "role-badge admin" : "role-badge"}>{user.role === "ADMIN" ? <><ShieldCheck size={14} /> Administrador</> : <><UserRound size={14} /> Usuário</>}</span><span className={user.isActive ? "status-badge active" : "status-badge inactive"}>{user.isActive ? "Ativo" : "Desativado"}</span><span>{user._count?.transactions ?? 0}</span><span className="row-actions"><button className="icon-button" onClick={() => { setEditing(user); setError(""); }} title="Editar usuário"><Pencil size={16} /></button><button className="icon-button danger" onClick={() => void remove(user)} disabled={user.id === currentUser.id} title={user.id === currentUser.id ? "Sua conta não pode ser excluída" : "Excluir usuário"}><Trash2 size={16} /></button></span></div>)}</div>
    {editing && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}><section className="modal-card admin-user-modal"><div className="modal-header"><div><p className="eyebrow">Administração</p><h2>{editing === "new" ? "Novo usuário" : "Editar usuário"}</h2></div><button className="icon-button" onClick={() => setEditing(null)}><X /></button></div><form onSubmit={submit}>
      <label>Nome<input name="name" defaultValue={editing === "new" ? "" : editing.name} minLength={2} maxLength={100} required /></label>
      <label>E-mail<input name="email" type="email" defaultValue={editing === "new" ? "" : editing.email} required /></label>
      <div className="form-grid"><label>Perfil<select name="role" defaultValue={editing === "new" ? "USER" : editing.role} disabled={editing !== "new" && editing.id === currentUser.id}><option value="USER">Usuário</option><option value="ADMIN">Administrador</option></select></label>{editing !== "new" && <label>Status<select name="isActive" defaultValue={String(editing.isActive)} disabled={editing.id === currentUser.id}><option value="true">Ativo</option><option value="false">Desativado</option></select></label>}</div>
      <label>{editing === "new" ? "Senha" : "Nova senha"}<span className="password-admin-field"><KeyRound size={17} /><input name="password" type="password" minLength={8} maxLength={72} required={editing === "new"} placeholder={editing === "new" ? "Mínimo de 8 caracteres" : "Deixe vazio para manter a atual"} /></span></label>
      <p className="admin-password-note">Por segurança, a senha atual nunca é exibida. Uma nova senha substitui a anterior.</p>
      <div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" disabled={loading}>{loading ? "Salvando..." : "Salvar usuário"}</button></div>
    </form></section></div>}
  </section>;
}
