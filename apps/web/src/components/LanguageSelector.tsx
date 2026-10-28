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
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-[#F7931E] bg-[#FFF6EB] text-[#102F57] font-semibold shadow-sm"
                  : "border-[#DCE4EE] bg-white text-[#263445] hover:border-[#102F57]/40 hover:bg-[#F3F6FA]"
              }`}
            >
              <div>
                <p className="font-semibold text-sm font-devanagari">{lang.native}</p>
                <p className="text-xs text-[#64748B] font-sans">{lang.label}</p>
              </div>
              {isSelected && <Check className="w-4 h-4 text-[#F7931E]" />}
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#DCE4EE] bg-white hover:bg-[#F3F6FA] text-[#102F57] text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#102F57]/20 shadow-2xs"
      >
        <Globe className="w-4 h-4 text-[#F7931E]" />
        <span className="font-devanagari">{current.native}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-[#DCE4EE] bg-white shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2 border-b border-[#DCE4EE] bg-[#E8EEF5]/60 text-[11px] font-bold uppercase tracking-wider text-[#102F57]">
            {t("common.selectLanguage")}
          </div>
          {languages.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-colors ${
                  isSelected
                    ? "bg-[#FFF6EB] text-[#102F57] font-bold"
                    : "text-[#263445] hover:bg-[#F3F6FA]"
                }`}
              >
                <span className="font-devanagari">{lang.native}</span>
                <span className="text-xs text-[#64748B] font-sans">({lang.label})</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#F7931E] ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
