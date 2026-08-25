import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlertsView } from "./AlertsView";

describe("central de avisos", () => {
  it("renderiza estado vazio acessível", () => {
    const html = renderToStaticMarkup(<AlertsView items={[]} readIds={[]} onReadAll={() => undefined} onDismiss={() => undefined} onOpen={() => undefined} />);
    expect(html).toContain("Tudo em dia");
    expect(html).toContain('aria-labelledby="alerts-title"');
  });

  it("diferencia aviso novo e crítico", () => {
    const html = renderToStaticMarkup(<AlertsView items={[{
      id: "invoice:one", kind: "CARD_INVOICE", severity: "CRITICAL", title: "Fatura vencida", message: "Nubank: R$ 100,00 venceu.", date: "2026-08-24", actionView: "cards",
    }]} readIds={[]} onReadAll={() => undefined} onDismiss={() => undefined} onOpen={() => undefined} />);
    expect(html).toContain("alert-critical");
    expect(html).toContain("Novo");
    expect(html).toContain("Ver detalhes");
  });
});
