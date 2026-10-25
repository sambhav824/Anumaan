"use client";

import React from "react";
import { Menu, Search, User } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  onMenuToggle?: () => void;
  onSearch?: (term: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

export function Header({
  onMenuToggle,
  onSearch,
  searchPlaceholder,
  showSearch = true,
}: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="h-16 px-6 bg-white border-b border-anumaan-border flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-md text-anumaan-charcoal-600 hover:bg-anumaan-beige-100"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {showSearch && (
          <div className="relative max-w-md w-full hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-anumaan-charcoal-400" />
            <input
              type="text"
              placeholder={searchPlaceholder || t("common.search")}
              onChange={(e) => onSearch && onSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm rounded-md border border-anumaan-border bg-anumaan-beige-50/50 text-anumaan-charcoal-800 placeholder:text-anumaan-charcoal-400 focus:outline-none focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari transition-colors"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Multilingual Selector */}
        <LanguageSelector variant="header" />

        {/* User avatar indicator */}
        <div className="flex items-center gap-2 pl-2 border-l border-anumaan-border">
          <div className="w-8 h-8 rounded-full bg-anumaan-beige-200 border border-anumaan-border flex items-center justify-center text-anumaan-charcoal-700">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
