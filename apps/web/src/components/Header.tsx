"use client";

import React from "react";
import Link from "next/link";
import { Menu, Search, User, Play } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { Logo } from "./Logo";
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
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-[#DCE4EE] flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3 sm:gap-4 flex-1">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg text-[#102F57] hover:bg-[#F3F6FA] transition-colors"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Mobile brand indicator */}
        <div className="md:hidden flex items-center">
          <Logo showTagline={false} size="sm" />
        </div>

        {showSearch && (
          <div className="relative max-w-md w-full hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder={searchPlaceholder || t("common.search")}
              onChange={(e) => onSearch && onSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-[#DCE4EE] bg-[#F3F6FA]/70 text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] focus:bg-white font-devanagari transition-all"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* 3D Intro Button */}
        <Link
          href="/intro"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#102F57] bg-[#F3F6FA] hover:bg-[#E8EEF5] border border-[#DCE4EE] rounded-xl transition shadow-2xs group"
          title="Watch 3D Construction Intro"
        >
          <span className="w-2 h-2 rounded-full bg-[#F7931E] animate-pulse" />
          <span>3D Intro</span>
        </Link>

        {/* Multilingual Selector */}
        <LanguageSelector variant="header" />

        {/* User avatar indicator */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#DCE4EE]">
          <div
            className="w-8 h-8 rounded-full bg-[#102F57] text-[#F7931E] border border-[#102F57]/20 flex items-center justify-center font-bold text-xs shadow-2xs"
            title={user?.email || "User"}
          >
            {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-4 h-4 text-white" />}
          </div>
        </div>
      </div>
    </header>
  );
}
