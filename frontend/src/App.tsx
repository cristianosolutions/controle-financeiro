import { useCallback, useEffect, useState } from "react";
import { BarChart3, Landmark, LogOut, Menu, Plus, Tags, X } from "lucide-react";
import { AuthScreen } from "./components/AuthScreen";
import { CategoriesView } from "./components/CategoriesView";
import { DashboardView } from "./components/DashboardView";
import { TransactionModal } from "./components/TransactionModal";
import { TransactionsView } from "./components/TransactionsView";
import { ApiError, api } from "./lib/api";
import type { Category, Summary, Transaction, User } from "./types";

type View = "dashboard" | "transactions" | "categories";
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modal, setModal] = useState<null | "new" | Transaction>(null);
  const [notice, setNotice] = useState("");

  const logout = useCallback(() => {
    localStorage.removeItem("finance-token");
    setUser(null);
  }, []);
  const loadData = useCallback(async () => {
    try {
      const range = monthRange(month);
      const [summaryData, categoryData, transactionData] = await Promise.all([
        api<Summary>(`/dashboard/summary?month=${month}`),
        api<Category[]>("/categories"),
        api<{ items: Transaction[]; pagination: { pages: number } }>(
          `/transactions?from=${range.from}&to=${range.to}&page=${page}`,
        ),
      ]);
      setSummary(summaryData);
      setCategories(categoryData);
      setTransactions(transactionData.items);
      setPages(transactionData.pagination.pages);
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
    { id: "transactions", label: "Lançamentos", icon: Landmark },
    { id: "categories", label: "Categorias", icon: Tags },
  ] as const;
  return (
    <div className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark">
              <Landmark size={20} />
            </span>{" "}
            fluxo
          </div>
          <button className="mobile-close" onClick={() => setMenuOpen(false)}>
            <X />
          </button>
        </div>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => {
                setView(id);
                setMenuOpen(false);
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <button className="sidebar-add" onClick={() => setModal("new")}>
          <Plus size={18} /> Novo lançamento
        </button>
        <div className="user-block">
          <span>{user.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button onClick={logout} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="mobile-header">
          <button onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <strong>fluxo</strong>
          <button onClick={() => setModal("new")}>
            <Plus />
          </button>
        </header>
        {notice && <div className="toast">{notice}</div>}
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
        {view === "categories" && (
          <CategoriesView categories={categories} onChanged={loadData} />
        )}
      </main>
      {modal && (
        <TransactionModal
          categories={categories}
          transaction={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
