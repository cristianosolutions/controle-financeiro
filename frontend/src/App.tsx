import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, BarChart3, Bell, ChevronDown, ClipboardList, CreditCard, FileBarChart, FileUp, Flag, Landmark, LineChart, LogOut, Menu, MoreHorizontal, PiggyBank, Plus, Repeat2, ShieldCheck, Tags, Users, WalletCards, X } from "lucide-react";
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
import { ProfilePhotoModal } from "./components/ProfilePhotoModal";
import { ApiError, api, apiFile } from "./lib/api";
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
const viewNavigationGroups: Record<View, string> = {
  dashboard: "principal",
  alerts: "principal",
  transactions: "movements",
  accounts: "movements",
  transfers: "movements",
  cards: "movements",
  categories: "movements",
  recurrences: "planning",
  budgets: "planning",
  forecast: "planning",
  goals: "planning",
  reports: "analysis",
  import: "analysis",
  security: "system",
  users: "system",
  audit: "system",
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
  const [profilePhotoOpen, setProfilePhotoOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [openNavigationGroup, setOpenNavigationGroup] = useState(() =>
    localStorage.getItem("finance-navigation-group") ?? "principal",
  );

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
    if (!user?.hasAvatar) {
      setAvatarUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let active = true;
    apiFile("/auth/avatar")
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setAvatarUrl(objectUrl);
      })
      .catch(() => active && setAvatarUrl(null));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user?.hasAvatar, avatarRevision]);
  useEffect(() => {
    if (!user) return;
    setReadAlertIds(readAlertPreference(localStorage, user.id, "read"));
    setDismissedAlertIds(readAlertPreference(localStorage, user.id, "dismissed"));
  }, [user]);
  useEffect(() => {
    localStorage.setItem("finance-navigation-group", openNavigationGroup);
  }, [openNavigationGroup]);
  useEffect(() => {
    setOpenNavigationGroup(viewNavigationGroups[view]);
  }, [view]);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);
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
      if (event.key === "Escape") {
        setMenuOpen(false);
        setModal(null);
        setProfilePhotoOpen(false);
      }
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

  const navigationGroups = [
    {
      id: "principal",
      label: "Principal",
      items: [
        { id: "dashboard" as const, label: "Visão geral", icon: BarChart3 },
        { id: "alerts" as const, label: "Avisos", icon: Bell },
      ],
    },
    {
      id: "movements",
      label: "Movimentações",
      items: [
        { id: "transactions" as const, label: "Lançamentos", icon: Landmark },
        { id: "accounts" as const, label: "Contas", icon: WalletCards },
        { id: "transfers" as const, label: "Transferências", icon: ArrowLeftRight },
        { id: "cards" as const, label: "Cartões", icon: CreditCard },
        { id: "categories" as const, label: "Categorias", icon: Tags },
      ],
    },
    {
      id: "planning",
      label: "Planejamento",
      items: [
        { id: "recurrences" as const, label: "Recorrências", icon: Repeat2 },
        { id: "budgets" as const, label: "Orçamentos", icon: PiggyBank },
        { id: "forecast" as const, label: "Previsão", icon: LineChart },
        { id: "goals" as const, label: "Metas", icon: Flag },
      ],
    },
    {
      id: "analysis",
      label: "Análise e dados",
      items: [
        { id: "reports" as const, label: "Relatórios", icon: FileBarChart },
        { id: "import" as const, label: "Importar CSV", icon: FileUp },
      ],
    },
    {
      id: "system",
      label: "Sistema",
      items: [
        { id: "security" as const, label: "Segurança", icon: ShieldCheck },
        ...(user.role === "ADMIN"
          ? [
              { id: "users" as const, label: "Usuários", icon: Users },
              { id: "audit" as const, label: "Auditoria", icon: ClipboardList },
            ]
          : []),
      ],
    },
  ];
  const unreadAlerts = alerts.filter(
    (item) =>
      !dismissedAlertIds.includes(item.id) && !readAlertIds.includes(item.id),
  ).length;
  function navigateTo(nextView: View, group?: string) {
    setView(nextView);
    if (group) setOpenNavigationGroup(group);
    setMenuOpen(false);
    setTimeout(() => document.getElementById("main-content")?.focus(), 0);
  }
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
          {navigationGroups.map((group) => {
            const expanded = openNavigationGroup === group.id;
            const groupActive = group.items.some((item) => item.id === view);
            return (
              <section className={`nav-group${groupActive ? " current" : ""}`} key={group.id}>
                <button
                  className="nav-group-toggle"
                  aria-expanded={expanded}
                  aria-controls={`navigation-${group.id}`}
                  onClick={() => setOpenNavigationGroup(expanded ? "" : group.id)}
                >
                  <span>{group.label}</span>
                  {groupActive && <i aria-label="Seção atual" />}
                  <ChevronDown aria-hidden="true" />
                </button>
                <div
                  className="nav-group-items"
                  id={`navigation-${group.id}`}
                  hidden={!expanded}
                >
                  {group.items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      className={view === id ? "active" : ""}
                      aria-current={view === id ? "page" : undefined}
                      onClick={() => navigateTo(id, group.id)}
                    >
                      <Icon size={19} />
                      <span>{label}</span>
                      {id === "alerts" && unreadAlerts > 0 && (
                        <span className="nav-alert-count" aria-label={`${unreadAlerts} avisos não lidos`}>
                          {unreadAlerts}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </nav>
        <button className="sidebar-add" onClick={() => setModal("new")} aria-keyshortcuts="Control+N Meta+N" title="Novo lançamento (Ctrl+N)">
          <Plus size={18} /> Novo lançamento
        </button>
        <div className="user-block">
          <button
            className="profile-avatar-button"
            onClick={() => setProfilePhotoOpen(true)}
            title="Alterar foto de perfil"
            aria-label="Adicionar ou alterar foto de perfil"
          >
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{user.name.slice(0, 2).toUpperCase()}</span>}
          </button>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button className="logout-button" onClick={() => void signOut()} title="Sair" aria-label="Sair da conta">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}
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
      <nav className="mobile-bottom-nav" aria-label="Atalhos principais">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => navigateTo("dashboard", "principal")}>
          <BarChart3 /><span>Visão geral</span>
        </button>
        <button className={view === "transactions" ? "active" : ""} onClick={() => navigateTo("transactions", "movements")}>
          <Landmark /><span>Lançamentos</span>
        </button>
        <button className={view === "alerts" ? "active" : ""} onClick={() => navigateTo("alerts", "principal")}>
          <span className="mobile-nav-icon"><Bell />{unreadAlerts > 0 && <i>{unreadAlerts}</i>}</span>
          <span>Avisos</span>
        </button>
        <button className={!["dashboard", "transactions", "alerts"].includes(view) ? "active" : ""} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
          <MoreHorizontal /><span>Mais</span>
        </button>
      </nav>
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
      {profilePhotoOpen && (
        <ProfilePhotoModal
          user={user}
          avatarUrl={avatarUrl}
          onClose={() => setProfilePhotoOpen(false)}
          onChanged={(updatedUser, message) => {
            setUser(updatedUser);
            setAvatarRevision((revision) => revision + 1);
            setNotice(message);
            setTimeout(() => setNotice(""), 3000);
          }}
        />
      )}
    </div>
  );
}
