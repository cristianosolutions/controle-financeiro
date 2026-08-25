export function parseCsv(content: string) {
  const text = content.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("O arquivo possui aspas abertas ou uma linha incompleta.");
  return rows;
}

const normalize = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases: Record<string, string[]> = {
  date: ["data", "date"], description: ["descricao", "description"], type: ["tipo", "type"], category: ["categoria", "category"],
  account: ["conta", "account"], paymentMethod: ["formadepagamento", "pagamento", "paymentmethod"], card: ["cartao", "card"],
  status: ["situacao", "status"], amount: ["valorrs", "valor", "amount"], notes: ["observacao", "notas", "notes"],
};

export type CsvTransactionRow = { rowNumber: number; date: string; description: string; type: string; category: string; account: string; paymentMethod: string; card: string; status: string; amount: string; notes: string };
export function transactionRowsFromCsv(content: string): CsvTransactionRow[] {
  const [headers, ...data] = parseCsv(content);
  if (!headers) throw new Error("O arquivo CSV está vazio.");
  const indexes = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, headers.findIndex((header) => names.includes(normalize(header)))]));
  for (const required of ["date", "description", "type", "category", "amount"]) {
    if (indexes[required] === -1) throw new Error(`Coluna obrigatória ausente: ${aliases[required]![0]}.`);
  }
  const value = (row: string[], field: string) => indexes[field] >= 0 ? row[indexes[field]] ?? "" : "";
  return data.map((row, index) => ({ rowNumber: index + 2, date: value(row, "date"), description: value(row, "description"), type: value(row, "type"), category: value(row, "category"), account: value(row, "account"), paymentMethod: value(row, "paymentMethod"), card: value(row, "card"), status: value(row, "status"), amount: value(row, "amount"), notes: value(row, "notes") }));
}
