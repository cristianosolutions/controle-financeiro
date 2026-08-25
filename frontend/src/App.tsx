import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, BarChart3, Bell, ClipboardList, CreditCard, FileBarChart, FileUp, Flag, Landmark, LineChart, LogOut, Menu, PiggyBank, Plus, Repeat2, ShieldCheck, Tags, Users, WalletCards, X } from "lucide-react";
import { AdminUsersView } from "./components/AdminUsersView";
import { AccountsView } from "./components/AccountsView";
import { CardsView } from "./components/CardsView";
import { RecurrencesView } from "./components/RecurrencesView";
import { BudgetsView } from "./components/BudgetsView";
import { ForecastView } from "./components/ForecastView";
import { GoalsView } from "./components/GoalsView";
import { ImportView } from "./components/ImportView";
import { SecurityView } from "./components/SecurityView";
import { AuditLogsView } from "./components/AuditLogsView";
import { AlertsView } from "./components/AlertsView";
import { TransfersView } from "./components/TransfersView";
import { AuthScreen } from "./components/AuthScreen";
import { CategoriesView } from "./components/CategoriesView";
import { DashboardView } from "./components/DashboardView";
import { TransactionModal } from "./components/TransactionModal";
import { TransactionsView } from "./components/TransactionsView";
import { ReportsView } from "./components/ReportsView";
import { ApiError, api } from "./lib/api";
import { readAlertPreference, writeAlertPreference } from "./lib/alert-preferences";
import type { Account, AlertsResponse, Budget, Category, CreditCard as CreditCardData, FinancialAlert, RecurringTransaction, Summary, Transaction, User } from "./types";

type View = "dashboard" | "alerts" | "accounts" | "transfers" | "cards" | "recurrences" | "budgets" | "forecast" | "goals" | "transactions" | "categories" | "reports" | "import" | "security" | "users" | "audit";
const viewTitles: Record<View, string> = {
  dashboard: "Visão geral",
  alerts: "Avisos",
  accounts: "Contas",
  transfers: "Transferências",
  cards: "Cartões",
  recurrences: "Recorrências",
  budgets: "Orçamentos",
  forecast: "Previsão financeira",
  goals: "Metas",
  transactions: "Lançamentos",
  categories: "Categorias",
  reports: "Relatórios",
  import: "Importar CSV",
  security: "Segurança",
  users: "Usuários",
  audit: "Auditoria",
};
const currentMonth = new Date().toISOString().slice(0, 7);

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCardData[]>([]);
  const [recurrences, setRecurrences] = useState<RecurringTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modal, setModal] = useState<null | "new" | Transaction>(null);
  const [notice, setNotice] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem("finance-token");
    setUser(null);
  }, []);
  async function signOut() {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* A limpeza local ainda deve ocorrer. */ }
    logout();
  }
  const loadData = useCallback(async () => {
    try {
      const range = monthRange(month);
      const [summaryData, categoryData, accountData, cardData, recurrenceData, budgetData, transactionData, alertsData] = await Promise.all([
        api<Summary>(`/dashboard/summary?month=${month}`),
        api<Category[]>("/categories"),
        api<Account[]>("/accounts"),
        api<CreditCardData[]>("/cards"),
        api<RecurringTransaction[]>("/recurrences"),
        api<Budget[]>(`/budgets?month=${month}`),
        api<{ items: Transaction[]; pagination: { pages: number } }>(
          `/transactions?from=${range.from}&to=${range.to}&page=${page}`,
        ),
        api<AlertsResponse>("/alerts"),
      ]);
      setSummary(summaryData);
      setCategories(categoryData);
      setAccounts(accountData);
      setCards(cardData);
      setRecurrences(recurrenceData);
      setBudgets(budgetData);
      setTransactions(transactionData.items);
      setPages(transactionData.pagination.pages);
      setAlerts(alertsData.items);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) logout();
      else
        setNotice(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados",
        );
    }
  }, [logout, month, page]);

  useEffect(() => {
    const token = localStorage.getItem("finance-token");
    if (!token) {
      setBooting(false);
      return;
    }
    api<User>("/auth/me")
      .then(setUser)
      .catch(logout)
      .finally(() => setBooting(false));
  }, [logout]);
  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);
  useEffect(() => {
    if (!user) return;
    setReadAlertIds(readAlertPreference(localStorage, user.id, "read"));
    setDismissedAlertIds(readAlertPreference(localStorage, user.id, "dismissed"));
  }, [user]);
  useEffect(() => {
    document.title = user ? `${viewTitles[view]} — Control Finance` : "Control Finance — Controle financeiro";
  }, [user, view]);
  useEffect(() => {
    if (!user) return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("action") === "new-transaction") setModal("new");
    const requestedView = query.get("view");
    if (requestedView && ["dashboard", "alerts", "accounts", "transfers", "cards", "recurrences", "budgets", "forecast", "goals", "transactions", "categories", "reports", "import", "security"].includes(requestedView)) setView(requestedView as View);
    window.history.replaceState({}, "", window.location.pathname);
  }, [user]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable=true]");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n" && !typing && user) { event.preventDefault(); setModal("new"); }
      if (event.key === "Escape") { setMenuOpen(false); setModal(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [user]);

  function authenticate(token: string, authenticatedUser: User) {
    localStorage.setItem("finance-token", token);
    setUser(authenticatedUser);
  }
  function saved() {
    setModal(null);
    setNotice("Lançamento salvo com sucesso");
    void loadData();
    setTimeout(() => setNotice(""), 3000);
  }
  function storeReadAlerts(ids: string[]) {
    setReadAlertIds(user ? writeAlertPreference(localStorage, user.id, "read", ids) : ids);
  }
  function dismissAlert(id: string) {
    const ids = [...new Set([...dismissedAlertIds, id])];
    setDismissedAlertIds(user ? writeAlertPreference(localStorage, user.id, "dismissed", ids) : ids);
  }
  if (booting)
    return (
      <div className="splash">
        <span className="brand-mark">
          <Landmark />
        </span>
      </div>
    );
  if (!user) return <AuthScreen onAuthenticated={authenticate} />;

  const navigation = [
    { id: "dashboard", label: "Visão geral", icon: BarChart3 },
    { id: "alerts", label: "Avisos", icon: Bell },
    { id: "accounts", label: "Contas", icon: WalletCards },
    { id: "transfers", label: "Transferências", icon: ArrowLeftRight },
    { id: "cards", label: "Cartões", icon: CreditCard },
    { id: "recurrences", label: "Recorrências", icon: Repeat2 },
    { id: "budgets", label: "Orçamentos", icon: PiggyBank },
    { id: "forecast", label: "Previsão", icon: LineChart },
    { id: "goals", label: "Metas", icon: Flag },
    { id: "transactions", label: "Lançamentos", icon: Landmark },
    { id: "categories", label: "Categorias", icon: Tags },
    { id: "reports", label: "Relatórios", icon: FileBarChart },
    { id: "import", label: "Importar CSV", icon: FileUp },
    { id: "security", label: "Segurança", icon: ShieldCheck },
    ...(user.role === "ADMIN" ? [{ id: "users" as const, label: "Usuários", icon: Users }] : []),
    ...(user.role === "ADMIN" ? [{ id: "audit" as const, label: "Auditoria", icon: ClipboardList }] : []),
  ] as const;
  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark">
              <Landmark size={20} />
            </span>{" "}
            Control Finance
          </div>
          <button className="mobile-close" onClick={() => setMenuOpen(false)}>
            <X aria-hidden="true" /><span className="sr-only">Fechar menu</span>
          </button>
        </div>
        <nav aria-label="Navegação principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                setView(id);
                setMenuOpen(false);
                setTimeout(() => document.getElementById("main-content")?.focus(), 0);
              }}
            >
              <Icon size={19} />
              {label}
              {id === "alerts" && alerts.filter((item) => !dismissedAlertIds.includes(item.id) && !readAlertIds.includes(item.id)).length > 0 && (
                <span className="nav-alert-count" aria-label={`${alerts.filter((item) => !dismissedAlertIds.includes(item.id) && !readAlertIds.includes(item.id)).length} avisos não lidos`}>
                  {alerts.filter((item) => !dismissedAlertIds.includes(item.id) && !readAlertIds.includes(item.id)).length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <button className="sidebar-add" onClick={() => setModal("new")} aria-keyshortcuts="Control+N Meta+N" title="Novo lançamento (Ctrl+N)">
          <Plus size={18} /> Novo lançamento
        </button>
        <div className="user-block">
          <span>{user.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button onClick={() => void signOut()} title="Sair" aria-label="Sair da conta">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main-area" id="main-content" tabIndex={-1}>
        <header className="mobile-header">
          <button onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
            <Menu />
          </button>
          <strong>Control Finance</strong>
          <button onClick={() => setModal("new")} aria-label="Novo lançamento" aria-keyshortcuts="Control+N Meta+N">
            <Plus />
          </button>
        </header>
        {notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}
        {view === "dashboard" && (
          <DashboardView
            summary={summary}
            month={month}
            onMonth={(value) => {
              setMonth(value);
              setPage(1);
            }}
            onNew={() => setModal("new")}
          />
        )}
        {view === "transactions" && (
          <TransactionsView
            items={transactions}
            categories={categories}
            page={page}
            pages={pages}
            onPage={setPage}
            onNew={() => setModal("new")}
            onEdit={setModal}
            onChanged={loadData}
          />
        )}
        {view === "alerts" && (
          <AlertsView
            items={alerts.filter((item) => !dismissedAlertIds.includes(item.id))}
            readIds={readAlertIds}
            onReadAll={() => storeReadAlerts([...new Set([...readAlertIds, ...alerts.map((item) => item.id)])])}
            onDismiss={dismissAlert}
            onOpen={(item) => {
              storeReadAlerts([...new Set([...readAlertIds, item.id])]);
              setView(item.actionView);
              setTimeout(() => document.getElementById("main-content")?.focus(), 0);
            }}
          />
        )}
        {view === "accounts" && <AccountsView accounts={accounts} onChanged={loadData} />}
        {view === "transfers" && <TransfersView accounts={accounts} onChanged={loadData} />}
        {view === "cards" && <CardsView cards={cards} accounts={accounts} onChanged={loadData} />}
        {view === "recurrences" && <RecurrencesView items={recurrences} categories={categories} accounts={accounts} cards={cards} onChanged={loadData} />}
        {view === "budgets" && <BudgetsView budgets={budgets} categories={categories} month={month} onMonth={(value) => { setMonth(value); setPage(1); }} onChanged={loadData} />}
        {view === "forecast" && <ForecastView />}
        {view === "goals" && <GoalsView accounts={accounts} onFinancialChanged={loadData} />}
        {view === "categories" && (
          <CategoriesView categories={categories} onChanged={loadData} />
        )}
        {view === "reports" && (
          <ReportsView categories={categories} accounts={accounts} cards={cards} user={user} />
        )}
        {view === "import" && <ImportView onImported={loadData} />}
        {view === "security" && <SecurityView onLogout={logout} />}
        {view === "users" && user.role === "ADMIN" && <AdminUsersView currentUser={user} />}
        {view === "audit" && user.role === "ADMIN" && <AuditLogsView />}
      </main>
      {modal && (
        <TransactionModal
          accounts={accounts}
          cards={cards}
          categories={categories}
          transaction={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
