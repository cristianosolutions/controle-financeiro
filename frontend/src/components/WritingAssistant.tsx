import { useEffect, useState } from "react";
import { accentSuggestions } from "../lib/writing-suggestions";

type TextField = HTMLInputElement | HTMLTextAreaElement;
type SuggestionState = {
  field: TextField;
  start: number;
  end: number;
  items: string[];
  left: number;
  top: number;
  width: number;
};

const excludedNames = new Set(["email", "password", "confirmPassword", "currentPassword", "newPassword", "token", "notes"]);

function isTextField(target: EventTarget | null): target is TextField {
  if (target instanceof HTMLTextAreaElement) return !excludedNames.has(target.name);
  return target instanceof HTMLInputElement && ["text", "search"].includes(target.type) && !excludedNames.has(target.name);
}

export function WritingAssistant() {
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);

  useEffect(() => {
    function inspect(event: Event) {
      if (!isTextField(event.target)) return setSuggestion(null);
      const field = event.target;
      const end = field.selectionStart ?? field.value.length;
      const currentMatch = field.value.slice(0, end).match(/\p{L}+$/u);
      const words = [...field.value.matchAll(/\p{L}+/gu)];
      const candidateMatches = currentMatch
        ? [{ 0: currentMatch[0], index: end - currentMatch[0].length }, ...words.filter((word) => word.index !== end - currentMatch[0].length)]
        : words;
      const match = candidateMatches.find((word) => accentSuggestions(word[0]).length);
      if (!match || match.index === undefined) return setSuggestion(null);
      const items = accentSuggestions(match[0]);
      const rect = field.getBoundingClientRect();
      setSuggestion({ field, start: match.index, end: match.index + match[0].length, items, left: rect.left, top: rect.bottom + 6, width: rect.width });
    }
    function dismiss(event: Event) {
      if (event.target instanceof Element && event.target.closest(".writing-suggestions")) return;
      setSuggestion(null);
    }
    document.addEventListener("input", inspect);
    document.addEventListener("keyup", inspect);
    document.addEventListener("click", dismiss);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("input", inspect);
      document.removeEventListener("keyup", inspect);
      document.removeEventListener("click", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, []);

  function apply(value: string) {
    if (!suggestion) return;
    const { field, start, end } = suggestion;
    const nextValue = `${field.value.slice(0, start)}${value}${field.value.slice(end)}`;
    const prototype = field instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, nextValue);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.focus();
    field.setSelectionRange(start + value.length, start + value.length);
    setSuggestion(null);
  }

  if (!suggestion) return null;
  return (
    <div className="writing-suggestions" role="listbox" aria-label="Sugestões ortográficas" style={{ left: suggestion.left, top: suggestion.top, width: suggestion.width }}>
      <small>Sugestão de escrita</small>
      {suggestion.items.map((item) => <button type="button" role="option" key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => apply(item)}>{item}</button>)}
    </div>
  );
}
