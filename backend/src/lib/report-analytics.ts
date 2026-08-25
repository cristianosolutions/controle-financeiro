export type ReportItem = {
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: Date;
  account: { id: string; name: string; color: string } | null;
  card: { id: string; name: string; color: string } | null;
  paymentMethod: string | null;
};

type Group = { id: string; name: string; color: string | undefined; total: number; count: number };

function addGroup(map: Map<string, Group>, id: string, name: string, amount: number, color?: string) {
  const current = map.get(id) ?? { id, name, color, total: 0, count: 0 };
  current.total += amount;
  current.count += 1;
  map.set(id, current);
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function reportAnalytics(items: ReportItem[]) {
  const months = new Map<string, { month: string; income: number; expense: number; balance: number; count: number }>();
  const accounts = new Map<string, Group>();
  const paymentMethods = new Map<string, Group>();
  const cards = new Map<string, Group>();
  for (const item of items) {
    const amount = item.amount;
    const month = item.date.toISOString().slice(0, 7);
    const monthly = months.get(month) ?? { month, income: 0, expense: 0, balance: 0, count: 0 };
    monthly[item.type === "INCOME" ? "income" : "expense"] += amount;
    monthly.balance += item.type === "INCOME" ? amount : -amount;
    monthly.count += 1;
    months.set(month, monthly);
    if (item.account) addGroup(accounts, item.account.id, item.account.name, amount, item.account.color);
    if (item.paymentMethod) addGroup(paymentMethods, item.paymentMethod, item.paymentMethod, amount);
    if (item.card) addGroup(cards, item.card.id, item.card.name, amount, item.card.color);
  }
  const sorted = (map: Map<string, Group>) => [...map.values()].sort((a, b) => b.total - a.total);
  return {
    monthly: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    accounts: sorted(accounts),
    paymentMethods: sorted(paymentMethods),
    cards: sorted(cards),
  };
}
