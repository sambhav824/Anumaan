"use client";

import React, { useState } from "react";
import { useTranslation } from "../context/I18nContext";

export interface ProjectFormData {
  name: string;
  project_type: "building" | "road";
  client_id?: string;
  site_location?: string;
  city?: string;
  state?: string;
  description?: string;
  start_date?: string;
  status: "planning" | "in_progress" | "completed" | "archived";
  quotation_language: "en" | "mr" | "hi";
}

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  clients: { id: string; name: string }[];
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ProjectForm({
  initialData,
  clients,
  onSubmit,
  onCancel,
  loading = false,
}: ProjectFormProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<ProjectFormData>({
    name: initialData?.name || "",
    project_type: initialData?.project_type || "building",
    client_id: initialData?.client_id || "",
    site_location: initialData?.site_location || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    description: initialData?.description || "",
    start_date: initialData?.start_date || "",
    status: initialData?.status || "planning",
    quotation_language: initialData?.quotation_language || "en",
  });

  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError("Project name is required.");
      return;
    }
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || "Failed to save project.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Project Name */}
      <div>
        <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
          {t("projects.nameLabel")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder={t("projects.namePlaceholder")}
          required
          className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
        />
      </div>

      {/* Project Type & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.typeLabel")}
          </label>
          <select
            name="project_type"
            value={formData.project_type}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          >
            <option value="building">{t("projectType.building")}</option>
            <option value="road">{t("projectType.road")}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.statusLabel")}
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          >
            <option value="planning">{t("status.planning")}</option>
            <option value="in_progress">{t("status.in_progress")}</option>
            <option value="completed">{t("status.completed")}</option>
            <option value="archived">{t("status.archived")}</option>
          </select>
        </div>
      </div>

      {/* Client & Quotation Output Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.clientLabel")}
          </label>
          <select
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          >
            <option value="">-- {t("projects.selectClient")} --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.quotationLangLabel")}
          </label>
          <select
            name="quotation_language"
            value={formData.quotation_language}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          >
            <option value="en">English (Official BOQ)</option>
            <option value="mr">मराठी (दरपत्रक)</option>
            <option value="hi">हिन्दी (कोटेशन)</option>
          </select>
        </div>
      </div>

      {/* Location, City, State */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.locationLabel")}
          </label>
          <input
            type="text"
            name="site_location"
            value={formData.site_location}
            onChange={handleChange}
            placeholder={t("projects.locationPlaceholder")}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.cityLabel")}
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder={t("projects.cityPlaceholder")}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
            {t("projects.stateLabel")}
          </label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder={t("projects.statePlaceholder")}
            className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-devanagari"
          />
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
          {t("projects.startDateLabel")}
        </label>
        <input
          type="date"
          name="start_date"
          value={formData.start_date}
          onChange={handleChange}
          className="w-full px-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
          {t("projects.descriptionLabel")}
        </label>
        <textarea
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder={t("projects.descriptionPlaceholder")}
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
