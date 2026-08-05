import { createContext, useContext, useMemo, useState } from "react";
import { es } from "./es";
import { en } from "./en";
import { zh } from "./zh";
import type { Dictionary } from "./es";

export type Language = "es" | "en" | "zh";
export type { Dictionary };

const STORAGE_KEY = "orgcraft.language";

const dictionaries: Record<Language, Dictionary> = { es, en, zh };

export const LANGUAGE_LABELS: Record<Language, string> = {
  es: "Español",
  en: "English",
  zh: "中文",
};

function isLanguage(value: string | null): value is Language {
  return value === "es" || value === "en" || value === "zh";
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : "es";
  });

  function setLanguage(lang: Language) {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t: dictionaries[language] }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage debe usarse dentro de <LanguageProvider>");
  return ctx;
}

/** Shorthand for the common case of only needing the translated strings. */
export function useT(): Dictionary {
  return useLanguage().t;
}
