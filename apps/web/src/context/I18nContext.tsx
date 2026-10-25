"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "../messages/en.json";
import mr from "../messages/mr.json";
import hi from "../messages/hi.json";

export type Locale = "en" | "mr" | "hi";

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  isDevanagari: boolean;
}

const dictionaries: Record<Locale, Record<string, any>> = {
  en,
  mr,
  hi,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Initial language resolution: localStorage -> browser language -> default "en"
  useEffect(() => {
    try {
      const saved = localStorage.getItem("anumaan_locale") as Locale | null;
      if (saved && ["en", "mr", "hi"].includes(saved)) {
        setLocaleState(saved);
        return;
      }
      const navLang = navigator.language?.toLowerCase() || "";
      if (navLang.startsWith("mr")) {
        setLocaleState("mr");
      } else if (navLang.startsWith("hi")) {
        setLocaleState("hi");
      }
    } catch {
      // Ignore SSR/storage errors
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("anumaan_locale", newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // Ignore storage errors
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const dict = dictionaries[locale] || dictionaries.en;
    const parts = path.split(".");
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Fallback to English
        let fallback: any = dictionaries.en;
        for (const p of parts) {
          if (fallback && typeof fallback === "object" && p in fallback) {
            fallback = fallback[p];
          } else {
            fallback = path;
            break;
          }
        }
        current = fallback;
        break;
      }
    }

    let text = typeof current === "string" ? current : path;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return text;
  };

  const isDevanagari = locale === "mr" || locale === "hi";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isDevanagari }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
