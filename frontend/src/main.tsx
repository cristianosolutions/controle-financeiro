import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { PwaManager } from "./components/PwaManager";
import { AccessibilityManager } from "./components/AccessibilityManager";
import { WritingAssistant } from "./components/WritingAssistant";
import { capitalizeTextInput } from "./lib/text-capitalization";

createRoot(document.getElementById("root")!).render(
  <StrictMode><div lang="pt-BR" spellCheck autoCorrect="on" autoCapitalize="words" onInputCapture={capitalizeTextInput}><a className="skip-link" href="#main-content">Pular para o conteúdo</a><AccessibilityManager /><App /><PwaManager /><WritingAssistant /></div></StrictMode>,
);
