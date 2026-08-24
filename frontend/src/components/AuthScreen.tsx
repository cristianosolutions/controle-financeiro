import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Landmark } from "lucide-react";
import { api } from "../lib/api";
import type { User } from "../types";

interface Props {
  onAuthenticated: (token: string, user: User) => void;
}

export function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    };
    try {
      if (mode === "register") {
        await api<User>("/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      const result = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
      });
      onAuthenticated(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="brand">
          <span className="brand-mark">
            <Landmark size={20} />
          </span>{" "}
          Control Finance
        </div>
        <div className="hero-copy">
          <span className="eyebrow">Seu dinheiro, com clareza</span>
          <h1>Decisões melhores começam com uma visão simples.</h1>
          <p>
            Organize receitas, despesas e categorias em um só lugar. Sem
            planilhas confusas, sem surpresas no fim do mês.
          </p>
        </div>
        <div className="hero-quote">
          <strong>“Controle não é restrição.</strong>
          <br />É liberdade para escolher.”
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="mobile-brand">
            <Landmark size={20} /> Control Finance
          </span>
          <p className="eyebrow">
            {mode === "login" ? "Bem-vindo de volta" : "Comece agora"}
          </p>
          <h2>{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Acompanhe seu mês e mantenha o plano em dia."
              : "Leva menos de um minuto."}
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Nome
                <input
                  name="name"
                  placeholder="Como devemos chamar você?"
                  minLength={2}
                  required
                />
              </label>
            )}
            <label>
              E-mail
              <input
                name="email"
                type="email"
                placeholder="voce@exemplo.com"
                required
              />
            </label>
            <label>
              Senha
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo de 8 caracteres"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Mostrar senha"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button" disabled={loading}>
              {loading
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {mode === "login"
              ? "Ainda não tem uma conta?"
              : "Já tem uma conta?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
