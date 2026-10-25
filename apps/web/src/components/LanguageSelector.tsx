"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation, Locale } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const languages: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

interface LanguageSelectorProps {
  variant?: "header" | "settings";
}

export function LanguageSelector({ variant = "header" }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useTranslation();
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (code: Locale) => {
    setLocale(code);
    setIsOpen(false);

    // Persist to user profile in backend if authenticated
    if (session?.access_token) {
      try {
        await api.updateProfile({ language_preference: code });
      } catch (err) {
        console.warn("Could not persist language preference to backend profile:", err);
      }
    }
  };

  const current = languages.find((l) => l.code === locale) || languages[0];

  if (variant === "settings") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {languages.map((lang) => {
          const isSelected = locale === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`flex items-center justify-between p-3.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-anumaan-gold-500 bg-anumaan-gold-50/50 text-anumaan-charcoal-900 shadow-sm"
                  : "border-anumaan-border bg-white text-anumaan-charcoal-700 hover:border-anumaan-gold-500/40"
              }`}
            >
              <div>
                <p className="font-semibold text-sm font-devanagari">{lang.native}</p>
                <p className="text-xs text-anumaan-charcoal-500 font-sans">{lang.label}</p>
              </div>
              {isSelected && <Check className="w-4 h-4 text-anumaan-gold-600" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("common.selectLanguage")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-anumaan-border bg-white hover:bg-anumaan-beige-50 text-anumaan-charcoal-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-anumaan-gold-500/50"
      >
        <Globe className="w-4 h-4 text-anumaan-gold-600" />
        <span className="font-devanagari">{current.native}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-anumaan-charcoal-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 rounded-lg border border-anumaan-border bg-white shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-anumaan-border-light text-[11px] font-semibold uppercase tracking-wider text-anumaan-charcoal-400">
            {t("common.selectLanguage")}
          </div>
          {languages.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                  isSelected
                    ? "bg-anumaan-gold-50/70 text-anumaan-gold-700 font-semibold"
                    : "text-anumaan-charcoal-800 hover:bg-anumaan-beige-50"
                }`}
              >
                <span className="font-devanagari">{lang.native}</span>
                <span className="text-xs text-anumaan-charcoal-400 font-sans">({lang.label})</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-anumaan-gold-600 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
