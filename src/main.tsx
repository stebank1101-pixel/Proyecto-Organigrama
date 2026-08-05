import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { LanguageProvider } from "./lib/i18n";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("No se encontró el elemento #root en index.html");
}

createRoot(container).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>
);
