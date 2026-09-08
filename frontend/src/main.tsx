import { StrictMode, type FocusEvent } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { PwaManager } from "./components/PwaManager";
import { AccessibilityManager } from "./components/AccessibilityManager";
import { WritingAssistant } from "./components/WritingAssistant";
import { capitalizeTextInput } from "./lib/text-capitalization";

function preserveObservationTyping(event: FocusEvent<HTMLElement>) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || field.name !== "notes") return;
  field.spellcheck = false;
  field.setAttribute("autocorrect", "off");
  field.setAttribute("autocapitalize", "none");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><div lang="pt-BR" spellCheck autoCorrect="on" autoCapitalize="words" onFocusCapture={preserveObservationTyping} onInputCapture={capitalizeTextInput}><a className="skip-link" href="#main-content">Pular para o conteúdo</a><AccessibilityManager /><App /><PwaManager /><WritingAssistant /></div></StrictMode>,
);
