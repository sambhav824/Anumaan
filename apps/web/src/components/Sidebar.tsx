"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Calculator,
  FileSpreadsheet,
  BookOpen,
  Settings,
  LogOut,
  Building2,
  Lock,
} from "lucide-react";
import { useTranslation } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { Logo } from "./Logo";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { currentOrg, organizations, setCurrentOrg } = useOrg();

  const navItems = [
    {
      label: t("nav.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
      enabled: true,
    },
    {
      label: t("nav.projects"),
      href: "/projects",
      icon: FolderKanban,
      active: pathname.startsWith("/projects"),
      enabled: true,
    },
    {
      label: t("nav.clients"),
      href: "/clients",
      icon: Users,
      active: pathname.startsWith("/clients"),
      enabled: true,
    },
    {
      label: t("nav.estimates"),
      href: "/estimates",
      icon: Calculator,
      active: pathname.startsWith("/estimates"),
      enabled: true,
    },
    {
      label: t("nav.quotations"),
      href: "/quotations",
      icon: FileSpreadsheet,
      active: pathname.startsWith("/quotations"),
      enabled: true,
    },
    {
      label: t("nav.rateLibrary"),
      href: "#",
      icon: BookOpen,
      active: false,
      enabled: false,
      badge: t("nav.comingSoon"),
    },
    {
      label: t("nav.settings"),
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
      enabled: true,
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-anumaan-border flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center border-b border-anumaan-border-light">
        <Logo showTagline={false} />
      </div>

      {/* Organization Switcher Bar */}
      <div className="p-3 border-b border-anumaan-border-light bg-anumaan-beige-50/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-anumaan-charcoal-800 text-anumaan-gold-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            {organizations.length > 1 ? (
              <select
                aria-label={t("common.selectOrg") || "Active Organization"}
                value={currentOrg?.id || ""}
                onChange={(e) => {
                  const selected = organizations.find((o) => o.id === e.target.value);
                  if (selected) setCurrentOrg(selected);
                }}
                className="w-full text-xs font-medium text-anumaan-charcoal-900 bg-transparent border-0 truncate focus:ring-0 cursor-pointer p-0 font-devanagari"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs font-semibold text-anumaan-charcoal-900 truncate font-devanagari">
                {currentOrg?.name || "Sahyadri Infra"}
              </p>
            )}
            <p className="text-[10px] text-anumaan-charcoal-500 font-devanagari">
              {currentOrg?.user_role ? (t(`orgRole.${currentOrg.user_role}`) || currentOrg.user_role) : (t("orgRole.member") || "Member")}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          if (!item.enabled) {
            return (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-anumaan-charcoal-400 cursor-not-allowed opacity-60"
                title={item.badge}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span className="font-devanagari">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-anumaan-beige-200 text-anumaan-charcoal-600 px-1.5 py-0.5 rounded font-sans">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={idx}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                item.active
                  ? "bg-anumaan-gold-50 text-anumaan-gold-700 font-semibold border-l-2 border-anumaan-gold-600"
                  : "text-anumaan-charcoal-700 hover:bg-anumaan-beige-50 hover:text-anumaan-charcoal-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${item.active ? "text-anumaan-gold-600" : "text-anumaan-charcoal-500"}`} />
              <span className="font-devanagari">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-anumaan-border-light bg-white">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-anumaan-charcoal-800 truncate">
              {user?.email || "engineer@anumaan.in"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title={t("common.logout")}
            className="p-1.5 rounded text-anumaan-charcoal-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
