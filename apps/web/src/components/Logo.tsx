"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "../context/I18nContext";

interface LogoProps {
  showTagline?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
}

export function Logo({
  showTagline = false,
  className = "",
  size = "md",
  href = "/dashboard",
}: LogoProps) {
  const { t } = useTranslation();

  const dimensions = {
    sm: { width: 76, height: 38 },
    md: { width: 92, height: 46 },
    lg: { width: 130, height: 65 },
    xl: { width: 180, height: 90 },
  }[size];

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 group transition-opacity hover:opacity-95 ${className}`}
    >
      <div className="relative flex items-center justify-center bg-white rounded-lg p-0.5 shadow-2xs">
        <Image
          src="/assets/anumaan-logo.png"
          alt="अनुमान — ANUMAAN"
          width={dimensions.width}
          height={dimensions.height}
          priority
          className="object-contain h-auto w-auto transition-transform duration-200 group-hover:scale-[1.02]"
          style={{ maxHeight: `${dimensions.height}px`, width: "auto" }}
        />
      </div>

      {showTagline ? (
        <div className="hidden sm:flex flex-col border-l border-[#DCE4EE] pl-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#102F57] tracking-tight font-devanagari">
              अनुमान
            </span>
            <span className="text-[11px] font-semibold text-[#F7931E] tracking-tight font-sans">
              Anumaan
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#64748B] font-devanagari">
            {t("brand.tagline") || "मिनटों में पूरा अनुमान।"}
          </span>
        </div>
      ) : (
        <span className="sr-only">अनुमान Anumaan</span>
      )}
    </Link>
  );
}
