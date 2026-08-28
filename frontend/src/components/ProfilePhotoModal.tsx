import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Trash2, Upload, X } from "lucide-react";
import { api } from "../lib/api";
import type { User } from "../types";

interface Props {
  user: User;
  avatarUrl: string | null;
  onClose: () => void;
  onChanged: (user: User, message: string) => void;
}

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

export function ProfilePhotoModal({ user, avatarUrl, onClose, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) {
      setError("Escolha uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2 MB.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const updatedUser = await api<User>("/auth/avatar", {
        method: "PUT",
        body: form,
      });
      onChanged(updatedUser, user.hasAvatar ? "Foto de perfil atualizada" : "Foto de perfil adicionada");
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a foto");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm("Remover sua foto de perfil?")) return;
    setLoading(true);
    setError("");
    try {
      await api("/auth/avatar", { method: "DELETE" });
      onChanged({ ...user, hasAvatar: false }, "Foto de perfil removida");
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível remover a foto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card profile-photo-modal" role="dialog" aria-modal="true" aria-labelledby="profile-photo-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Seu perfil</p>
            <h2 id="profile-photo-title">Foto de perfil</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="profile-photo-preview">
          {avatarUrl ? (
            <img src={avatarUrl} alt={`Foto de ${user.name}`} />
          ) : (
            <span>{user.name.slice(0, 2).toUpperCase()}</span>
          )}
          <i><Camera size={20} /></i>
        </div>
        <div className="profile-photo-copy">
          <strong>{user.name}</strong>
          <p>Use uma imagem quadrada para obter o melhor enquadramento.</p>
          <small>JPG, PNG ou WEBP · tamanho máximo de 2 MB</small>
        </div>
        {error && <div className="form-error spaced">{error}</div>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void upload(event)}
          hidden
        />
        <div className="profile-photo-actions">
          <button className="primary-button" disabled={loading} onClick={() => inputRef.current?.click()}>
            <Upload size={17} />
            {loading ? "Aguarde..." : user.hasAvatar ? "Trocar foto" : "Adicionar foto"}
          </button>
          {user.hasAvatar && (
            <button className="ghost-button danger" disabled={loading} onClick={() => void remove()}>
              <Trash2 size={17} /> Remover
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
