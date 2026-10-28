"use client";

import React, { useEffect, useState } from "react";
import { Building2, Globe, Shield, Users, Save, CheckCircle } from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useOrg } from "../../../context/OrgContext";
import { LanguageSelector } from "../../../components/LanguageSelector";
import { api } from "../../../lib/api";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { currentOrg, refreshOrganizations } = useOrg();

  const [formData, setFormData] = useState({
    name: "",
    owner_person: "",
    email: "",
    phone: "",
    business_address: "",
    city: "",
    state: "",
    pin_code: "",
    gstin: "",
  });

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrg) {
      setFormData({
        name: currentOrg.name || "",
        owner_person: currentOrg.owner_person || "",
        email: currentOrg.email || "",
        phone: currentOrg.phone || "",
        business_address: currentOrg.business_address || "",
        city: currentOrg.city || "",
        state: currentOrg.state || "",
        pin_code: currentOrg.pin_code || "",
        gstin: currentOrg.gstin || "",
      });

      // Load organization members
      api.getOrgMembers(currentOrg.id)
        .then((m) => setMembers(m))
        .catch(() => {});
    }
  }, [currentOrg]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id) return;
    setError(null);
    setSuccess(false);

    try {
      setLoading(true);
      await api.updateOrganization(currentOrg.id, formData);
      await refreshOrganizations();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save company settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="pb-4 border-b border-[#DCE4EE]">
        <h1 className="text-2xl font-bold text-[#102F57] font-heading">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* 1. Language Preference Section */}
      <div className="p-6 rounded-xl bg-white border border-[#DCE4EE] shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCE4EE]">
          <Globe className="w-5 h-5 text-[#F7931E]" />
          <h2 className="text-base font-semibold text-[#102F57] font-heading">
            {t("settings.languagePreferences")}
          </h2>
        </div>
        <p className="text-sm text-[#64748B]">
          {t("settings.languageDescription")}
        </p>
        <LanguageSelector variant="settings" />
        <p className="text-xs text-[#64748B] italic pt-1">
          {t("settings.quotationLanguageNotice")}
        </p>
      </div>

      {/* 2. Company Profile Section */}
      <div className="p-6 rounded-xl bg-white border border-[#DCE4EE] shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCE4EE]">
          <Building2 className="w-5 h-5 text-[#F7931E]" />
          <h2 className="text-base font-semibold text-[#102F57] font-heading">
            {t("settings.orgDetails")}
          </h2>
        </div>

        {success && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-[#16835D]">
            <CheckCircle className="w-4 h-4 text-[#16835D]" />
            <span>{t("settings.profileUpdated")}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-[#C62828]">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
                {t("settings.companyName")} <span className="text-[#C62828]">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("settings.companyNamePlaceholder")}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
                {t("settings.ownerPerson")}
              </label>
              <input
                type="text"
                name="owner_person"
                value={formData.owner_person}
                onChange={handleChange}
                placeholder={t("settings.ownerPersonPlaceholder")}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
                {t("settings.email")}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57] font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
                {t("settings.phone")}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
              {t("settings.address")}
            </label>
            <input
              type="text"
              name="business_address"
              value={formData.business_address}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
                {t("settings.city")}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
                {t("settings.state")}
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
                {t("settings.pinCode")}
              </label>
              <input
                type="text"
                name="pin_code"
                value={formData.pin_code}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white focus:outline-none focus:ring-2 focus:ring-[#102F57]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1">
              {t("settings.gstin")}
            </label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#DCE4EE] text-[#263445] bg-white uppercase focus:outline-none focus:ring-2 focus:ring-[#102F57]"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#102F57] text-white text-sm font-semibold hover:bg-[#0c2444] transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#F7931E]" />
              <span>{loading ? t("common.saving") : t("common.save")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Members Overview */}
      <div className="p-6 rounded-xl bg-white border border-[#DCE4EE] shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCE4EE]">
          <Users className="w-5 h-5 text-[#F7931E]" />
          <h2 className="text-base font-semibold text-[#102F57] font-heading">
            {t("settings.membersTitle")}
          </h2>
        </div>

        <div className="divide-y divide-[#DCE4EE]">
          {members.length === 0 ? (
            <p className="text-sm text-[#64748B] py-2">
              {currentOrg?.owner_person || "Current User"} (Owner)
            </p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-medium text-[#263445]">
                  {m.user_full_name || "User"}
                </span>
                <span className="px-2 py-0.5 rounded text-xs uppercase tracking-wider font-semibold bg-[#EEF3F9] text-[#102F57] border border-[#DCE4EE]">
                  {m.role}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
