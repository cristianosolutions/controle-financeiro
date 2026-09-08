const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseCurrencyInput(value: string) {
  const normalized = value.trim().includes(",")
    ? value.trim().replace(/\./g, "").replace(",", ".")
    : value.trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatCurrencyInput(value: string | number) {
  const amount = typeof value === "number" ? value : parseCurrencyInput(value);
  return decimalFormatter.format(amount);
}
