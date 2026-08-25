export type ForecastFlow = {
  month: string;
  type: "INCOME" | "EXPENSE" | "CARD_INVOICE";
  amount: number;
};

export type ForecastMonth = {
  month: string;
  income: number;
  expense: number;
  cardInvoices: number;
  net: number;
  cumulativeBalance: number;
};

export function addMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, monthNumber! - 1 + amount, 1)).toISOString().slice(0, 7);
}

export function buildFinancialForecast(openingBalance: number, startMonth: string, monthsCount: number, flows: ForecastFlow[]) {
  let cumulativeBalance = openingBalance;
  const months: ForecastMonth[] = Array.from({ length: monthsCount }, (_, index) => {
    const month = addMonth(startMonth, index);
    const monthFlows = flows.filter((flow) => flow.month === month);
    const income = monthFlows.filter((flow) => flow.type === "INCOME").reduce((sum, flow) => sum + flow.amount, 0);
    const directExpenses = monthFlows.filter((flow) => flow.type === "EXPENSE").reduce((sum, flow) => sum + flow.amount, 0);
    const cardInvoices = monthFlows.filter((flow) => flow.type === "CARD_INVOICE").reduce((sum, flow) => sum + flow.amount, 0);
    const expense = directExpenses + cardInvoices;
    const net = income - expense;
    cumulativeBalance += net;
    return { month, income, expense, cardInvoices, net, cumulativeBalance };
  });
  return {
    openingBalance,
    finalBalance: cumulativeBalance,
    lowestBalance: Math.min(openingBalance, ...months.map((month) => month.cumulativeBalance)),
    totalIncome: months.reduce((sum, month) => sum + month.income, 0),
    totalExpense: months.reduce((sum, month) => sum + month.expense, 0),
    months,
  };
}
