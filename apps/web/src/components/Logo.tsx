"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "../context/I18nContext";

interface LogoProps {
  showTagline?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ showTagline = true, className = "", size = "md" }: LogoProps) {
  const { t } = useTranslation();

  return (
    <Link href="/dashboard" className={`inline-flex items-center gap-3 group ${className}`}>
      {/* Architectural Ruler / Cadastral Outline Glyph */}
      <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-anumaan-charcoal-900 border border-anumaan-gold-500/30 text-anumaan-gold-500 shadow-sm transition-transform duration-200 group-hover:scale-105">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          {/* Architectural Drafting Square & Ruler Markings */}
          <path d="M3 3v18h18" />
          <path d="M3 7h3" />
          <path d="M3 11h2" />
          <path d="M3 15h3" />
          <path d="M3 19h2" />
          <path d="M7 21v-3" />
          <path d="M11 21v-2" />
          <path d="M15 21v-3" />
          <path d="M19 21v-2" />
          <path d="M7 7l12 12" strokeDasharray="2 2" opacity="0.6" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className="font-devanagari font-bold text-xl tracking-tight text-anumaan-charcoal-900">
            अनुमान
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-anumaan-gold-600 font-sans">
            Anumaan
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] font-medium text-anumaan-charcoal-500 font-devanagari">
            {t("brand.tagline")}
          </span>
        )}
      </div>
    </Link>
  );
}
