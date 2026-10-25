"use client";

import React, { useState } from "react";
import { useTranslation } from "../context/I18nContext";

export interface ClientFormData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  gstin?: string;
}

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ClientForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: ClientFormProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name || "",
    contact_person: initialData?.contact_person || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    billing_address: initialData?.billing_address || "",
    gstin: initialData?.gstin || "",
  });

  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError("Client name is required.");
      return;
    }
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Failed to save client.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Client / Company Name */}
      <div>
        <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
          {t("clients.nameLabel")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder={t("clients.namePlaceholder")}
          required
          className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
        />
      </div>

      {/* Contact Person & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("clients.contactPersonLabel")}
          </label>
          <input
            type="text"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            placeholder={t("clients.contactPersonPlaceholder")}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("clients.phoneLabel")}
          </label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder={t("clients.phonePlaceholder")}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500"
          />
        </div>
      </div>

      {/* Email & GSTIN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("clients.emailLabel")}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t("clients.emailPlaceholder")}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("clients.gstinLabel")}
          </label>
          <input
            type="text"
            name="gstin"
            value={formData.gstin}
            onChange={handleChange}
            placeholder={t("clients.gstinPlaceholder")}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border uppercase focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500"
          />
        </div>
      </div>

      {/* Billing Address */}
      <div>
        <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
          {t("clients.billingAddressLabel")}
        </label>
        <textarea
          name="billing_address"
          rows={3}
          value={formData.billing_address}
          onChange={handleChange}
          placeholder={t("clients.billingAddressPlaceholder")}
          className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-anumaan-border-light">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded-md border border-anumaan-border text-sm font-medium text-anumaan-charcoal-700 hover:bg-anumaan-beige-50 transition-colors font-devanagari"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-md bg-anumaan-charcoal-900 text-white text-sm font-medium hover:bg-anumaan-charcoal-800 transition-colors font-devanagari disabled:opacity-50"
        >
          {loading ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
