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
      <div className="pb-4 border-b border-anumaan-border-light">
        <h1 className="text-2xl font-bold text-anumaan-charcoal-900 font-devanagari">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-anumaan-charcoal-500 font-devanagari mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* 1. Language Preference Section */}
      <div className="p-6 rounded-xl bg-white border border-anumaan-border shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-anumaan-border-light">
          <Globe className="w-5 h-5 text-anumaan-gold-600" />
          <h2 className="text-base font-semibold text-anumaan-charcoal-900 font-devanagari">
            {t("settings.languagePreferences")}
          </h2>
        </div>
        <p className="text-sm text-anumaan-charcoal-600 font-devanagari">
          {t("settings.languageDescription")}
        </p>
        <LanguageSelector variant="settings" />
        <p className="text-xs text-anumaan-charcoal-400 font-devanagari italic pt-1">
          {t("settings.quotationLanguageNotice")}
        </p>
      </div>

      {/* 2. Company Profile Section */}
      <div className="p-6 rounded-xl bg-white border border-anumaan-border shadow-xs space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-anumaan-border-light">
          <Building2 className="w-5 h-5 text-anumaan-gold-600" />
          <h2 className="text-base font-semibold text-anumaan-charcoal-900 font-devanagari">
            {t("settings.orgDetails")}
          </h2>
        </div>

        {success && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-800 font-devanagari">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{t("settings.profileUpdated")}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-devanagari">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("settings.companyName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("settings.companyNamePlaceholder")}
                required
                className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("settings.ownerPerson")}
              </label>
              <input
                type="text"
                name="owner_person"
                value={formData.owner_person}
                onChange={handleChange}
                placeholder={t("settings.ownerPersonPlaceholder")}
                className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("settings.email")}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("settings.phone")}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
              {t("settings.address")}
            </label>
            <input
              type="text"
              name="business_address"
              value={formData.business_address}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("settings.city")}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("settings.state")}
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("settings.pinCode")}
              </label>
              <input
                type="text"
                name="pin_code"
                value={formData.pin_code}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
              {t("settings.gstin")}
            </label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border uppercase focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-anumaan-charcoal-900 text-white text-sm font-semibold hover:bg-anumaan-charcoal-800 transition-colors shadow-xs font-devanagari disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-anumaan-gold-500" />
              <span>{loading ? t("common.saving") : t("common.save")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Members Overview */}
      <div className="p-6 rounded-xl bg-white border border-anumaan-border shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-anumaan-border-light">
          <Users className="w-5 h-5 text-anumaan-gold-600" />
          <h2 className="text-base font-semibold text-anumaan-charcoal-900 font-devanagari">
            {t("settings.membersTitle")}
          </h2>
        </div>

        <div className="divide-y divide-anumaan-border-light">
          {members.length === 0 ? (
            <p className="text-sm text-anumaan-charcoal-500 font-devanagari py-2">
              {currentOrg?.owner_person || "Current User"} (Owner)
            </p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-medium text-anumaan-charcoal-900 font-devanagari">
                  {m.user_full_name || "User"}
                </span>
                <span className="px-2 py-0.5 rounded text-xs uppercase tracking-wider font-semibold bg-anumaan-beige-100 text-anumaan-charcoal-700">
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
