import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  Landmark,
  PiggyBank,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { api } from "../lib/api";
import type { User } from "../types";

interface Props {
  onAuthenticated: (token: string, user: User) => void;
}

export function AuthScreen({ onAuthenticated }: Props) {
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    };
    try {
      if (mode === "reset") {
        if (form.get("password") !== form.get("confirmPassword")) throw new Error("A confirmação da senha não confere.");
        await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: form.get("token"), password: form.get("password") }) });
        setMode("login");
        setNotice("Senha redefinida. Entre usando sua nova senha.");
        return;
      }
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
    <main className="auth-page" id="main-content" tabIndex={-1}>
      <section className="auth-hero">
        <div className="financial-decoration" aria-hidden="true">
          <span className="finance-orbit orbit-one" />
          <span className="finance-orbit orbit-two" />
          <span className="finance-icon piggy"><PiggyBank /></span>
          <span className="finance-icon dollar"><CircleDollarSign /></span>
          <span className="finance-icon wallet"><WalletCards /></span>
          <span className="finance-icon growth"><TrendingUp /></span>
        </div>
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
        <div className="developer-credit">
          © {currentYear} · Desenvolvido por <strong>CristianoSolutions</strong>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="mobile-brand">
            <Landmark size={20} /> Control Finance
          </span>
          <p className="eyebrow">
            {mode === "login" ? "Bem-vindo de volta" : mode === "register" ? "Comece agora" : "Recuperação segura"}
          </p>
          <h2>{mode === "login" ? "Entre na sua conta" : mode === "register" ? "Crie sua conta" : "Redefina sua senha"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Acompanhe seu mês e mantenha o plano em dia."
              : mode === "register" ? "Leva menos de um minuto." : "Informe o código temporário fornecido pelo administrador."}
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
            {mode === "reset" && <label>Código de recuperação<input name="token" autoComplete="one-time-code" placeholder="Cole o código temporário" required minLength={20} /></label>}
            {mode !== "reset" && <label>
              E-mail
              <input
                name="email"
                type="email"
                placeholder="voce@exemplo.com"
                required
              />
            </label>}
            <label>
              Senha
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "login" ? "Sua senha" : "8+ caracteres, maiúscula e número"}
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
            {mode === "reset" && <label>Confirmar nova senha<div className="password-field"><input name="confirmPassword" type={showPassword ? "text" : "password"} minLength={8} required /></div></label>}
            {error && <div className="form-error">{error}</div>}
            {notice && <div className="admin-notice">{notice}</div>}
            <button className="primary-button" disabled={loading}>
              {loading
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : mode === "register" ? "Criar conta" : "Redefinir senha"}
              <ArrowRight size={18} />
            </button>
          </form>
          {mode === "login" && <button className="forgot-password" onClick={() => { setMode("reset"); setError(""); }}>Esqueci minha senha</button>}
          <p className="auth-switch">
            {mode === "login"
              ? "Ainda não tem uma conta?"
              : mode === "register" ? "Já tem uma conta?" : "Lembrou sua senha?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setNotice("");
              }}
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
          <p className="developer-credit mobile-credit">
            © {currentYear} · Desenvolvido por <strong>CristianoSolutions</strong>
          </p>
        </div>
      </section>
    </main>
  );
}
