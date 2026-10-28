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
  Receipt,
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

interface NavItem {
  label: string;
  href: string;
  icon: any;
  active: boolean;
  enabled: boolean;
  badge?: string;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { currentOrg, organizations, setCurrentOrg } = useOrg();

  const navItems: NavItem[] = [
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
      href: "/rate-library",
      icon: BookOpen,
      active: pathname.startsWith("/rate-library") || pathname.startsWith("/rates"),
      enabled: true,
    },
    {
      label: t("nav.invoices"),
      href: "/invoices",
      icon: Receipt,
      active: pathname.startsWith("/invoices"),
      enabled: true,
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
    <aside className="w-64 flex-shrink-0 bg-white border-r border-[#DCE4EE] flex flex-col h-screen sticky top-0 shadow-2xs">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center border-b border-[#DCE4EE] bg-white">
        <Logo showTagline={false} size="md" />
      </div>

      {/* Organization Switcher Bar */}
      <div className="p-3 border-b border-[#DCE4EE] bg-[#F3F6FA]/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#102F57] text-[#F7931E] flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-2xs">
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
                className="w-full text-xs font-semibold text-[#102F57] bg-transparent border-0 truncate focus:ring-0 cursor-pointer p-0 font-devanagari"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs font-semibold text-[#102F57] truncate font-devanagari">
                {currentOrg?.name || "Sahyadri Infra"}
              </p>
            )}
            <p className="text-[10px] text-[#64748B] font-devanagari">
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
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-[#94A3B8] cursor-not-allowed opacity-60"
                title={item.badge}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span className="font-devanagari">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-[#E8EEF5] text-[#64748B] px-1.5 py-0.5 rounded font-sans">
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                item.active
                  ? "bg-[#EEF3F9] text-[#102F57] font-semibold border-l-[3px] border-[#F7931E] shadow-2xs"
                  : "text-[#263445] hover:bg-[#F3F6FA] hover:text-[#102F57]"
              }`}
            >
              <Icon className={`w-4 h-4 ${item.active ? "text-[#F7931E]" : "text-[#64748B]"}`} />
              <span className="font-devanagari">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-[#DCE4EE] bg-white">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#263445] truncate">
              {user?.email || "engineer@anumaan.in"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title={t("common.logout")}
            className="p-1.5 rounded-md text-[#64748B] hover:text-[#C62828] hover:bg-[#FDF2F2] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
