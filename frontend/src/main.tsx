import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import { PwaManager } from "./components/PwaManager";
import { AccessibilityManager } from "./components/AccessibilityManager";

createRoot(document.getElementById("root")!).render(
  <StrictMode><a className="skip-link" href="#main-content">Pular para o conteúdo</a><AccessibilityManager /><App /><PwaManager /></StrictMode>,
);
