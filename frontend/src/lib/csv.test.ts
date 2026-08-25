import { describe, expect, it } from "vitest";
import { parseCsv, transactionRowsFromCsv } from "./csv";

describe("leitura de CSV no navegador", () => {
  it("preserva delimitadores e aspas dentro de campos", () => {
    expect(parseCsv('data;descrição;valor\n25/08/2026;"Mercado; bairro";12,50')).toEqual([
      ["data", "descrição", "valor"],
      ["25/08/2026", "Mercado; bairro", "12,50"],
    ]);
  });

  it("mapeia cabeçalhos em português para a prévia", () => {
    const [row] = transactionRowsFromCsv("Data,Descrição,Tipo,Categoria,Valor\n2026-08-25,Salário,Receita,Renda,1500");
    expect(row).toMatchObject({ rowNumber: 2, date: "2026-08-25", description: "Salário", type: "Receita", category: "Renda", amount: "1500" });
  });

  it("rejeita arquivo com aspas não encerradas", () => {
    expect(() => parseCsv('data;descrição\n25/08/2026;"aberto')).toThrow();
  });
});
