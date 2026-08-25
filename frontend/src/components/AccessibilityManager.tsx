import { useEffect } from "react";

export function AccessibilityManager() {
  useEffect(() => {
    let previousFocus: HTMLElement | null = null;
    let hadDialog = false;
    const prepareDialogs = () => {
      document.querySelectorAll<HTMLElement>(".modal-card:not([data-a11y-ready])").forEach((dialog, index) => {
        previousFocus = document.activeElement as HTMLElement | null;
        dialog.dataset.a11yReady = "true";
        dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.tabIndex = -1;
        const heading = dialog.querySelector<HTMLElement>("h2");
        if (heading) { heading.id ||= `dialog-title-${Date.now()}-${index}`; dialog.setAttribute("aria-labelledby", heading.id); }
        requestAnimationFrame(() => (dialog.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), button:not([disabled]), textarea:not([disabled])") ?? dialog).focus());
      });
      const hasDialog = Boolean(document.querySelector(".modal-card"));
      if (hadDialog && !hasDialog) previousFocus?.focus();
      hadDialog = hasDialog;
    };
    const observer = new MutationObserver(prepareDialogs); observer.observe(document.body, { childList: true, subtree: true }); prepareDialogs();
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialogs = [...document.querySelectorAll<HTMLElement>(".modal-card")]; const dialog = dialogs.at(-1); if (!dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')].filter((item) => item.offsetParent !== null);
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0]!, last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keyHandler);
    return () => { observer.disconnect(); document.removeEventListener("keydown", keyHandler); previousFocus?.focus(); };
  }, []);
  return null;
}
