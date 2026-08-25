import { describe, expect, it } from "vitest";
import { nextOccurrence, occurrenceDates } from "./recurrence.js";

describe("motor de recorrências", () => {
  it("preserva o último dia possível nos ciclos mensais", () => {
    expect(nextOccurrence(new Date("2026-01-31T00:00:00Z"), { frequency: "MONTHLY", intervalDays: null }).toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("gera recorrência quinzenal", () => {
    expect(nextOccurrence(new Date("2026-08-01T00:00:00Z"), { frequency: "BIWEEKLY", intervalDays: null }).toISOString().slice(0, 10)).toBe("2026-08-15");
  });

  it("respeita intervalo personalizado e data final", () => {
    const dates = occurrenceDates({ startDate: new Date("2026-08-01T00:00:00Z"), endDate: new Date("2026-08-21T00:00:00Z"), frequency: "CUSTOM", intervalDays: 10 }, new Date("2026-12-31T00:00:00Z"));
    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual(["2026-08-01", "2026-08-11", "2026-08-21"]);
  });

  it("limita a quantidade máxima de ocorrências", () => {
    expect(occurrenceDates({ startDate: new Date("2026-01-01T00:00:00Z"), endDate: null, frequency: "CUSTOM", intervalDays: 1 }, new Date("2030-01-01T00:00:00Z"), 20)).toHaveLength(20);
  });

  it("avança por um histórico antigo sem consumir o limite de datas úteis", () => {
    const dates = occurrenceDates({ startDate: new Date("2020-01-01T00:00:00Z"), endDate: null, frequency: "CUSTOM", intervalDays: 1 }, new Date("2026-08-31T00:00:00Z"), 31, new Date("2026-08-01T00:00:00Z"));
    expect(dates).toHaveLength(31);
    expect(dates[0]?.toISOString().slice(0, 10)).toBe("2026-08-01");
  });
});
