"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Calculator,
  Plus,
  Search,
  Filter,
  Building,
  Car,
  Calendar,
  Lock,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useOrg } from "../../../context/OrgContext";
import { api, Estimate } from "../../../lib/api";
import { Modal } from "../../../components/Modal";
import { formatIndianCurrency } from "../../../lib/calculations";

export default function EstimatesPage() {
  const { t } = useTranslation();
  const { currentOrg } = useOrg();

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    project_id: "",
    category: "building" as "building" | "road",
    estimate_number: "",
    overhead_pct: 0,
    contingency_pct: 0,
    discount_pct: 0,
    gst_pct: 0,
    notes: "",
  });

  const loadData = useCallback(async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      setError(null);
      const [estList, projList] = await Promise.all([
        api.listEstimates(currentOrg.id, {
          search: search.trim() || undefined,
          status: selectedStatus || undefined,
          category: selectedCategory || undefined,
          project_id: selectedProject || undefined,
        }),
        api.listProjects(currentOrg.id),
      ]);
      setEstimates(estList);
      setProjects(projList);
      if (projList.length > 0 && !createForm.project_id) {
        setCreateForm((prev) => ({ ...prev, project_id: projList[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load estimates:", err);
      setError(err?.message || "Failed to load estimates.");
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id, search, selectedStatus, selectedCategory, selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !createForm.project_id) return;

    try {
      setSubmitting(true);
      const created = await api.createEstimate(currentOrg.id, {
        name: createForm.name.trim(),
        project_id: createForm.project_id,
        category: createForm.category,
        estimate_number: createForm.estimate_number.trim() || undefined,
        overhead_pct: Number(createForm.overhead_pct) || 0,
        contingency_pct: Number(createForm.contingency_pct) || 0,
        discount_pct: Number(createForm.discount_pct) || 0,
        gst_pct: Number(createForm.gst_pct) || 0,
        notes: createForm.notes.trim() || undefined,
      });

      setShowCreateModal(false);
      setCreateForm({
        name: "",
        project_id: projects[0]?.id || "",
        category: "building",
        estimate_number: "",
        overhead_pct: 0,
        contingency_pct: 0,
        discount_pct: 0,
        gst_pct: 0,
        notes: "",
      });
      // Redirect to newly created estimate
      window.location.href = `/estimates/${created.id}`;
    } catch (err: any) {
      alert(err?.message || "Failed to create estimate");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock className="w-3 h-3 text-emerald-600" />
            {t("estimates.status_approved")}
          </span>
        );
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {t("estimates.status_submitted")}
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            {t("estimates.status_archived")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-anumaan-beige-100 text-anumaan-charcoal-700 border border-anumaan-border">
            {t("estimates.status_draft")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-anumaan-charcoal-900 font-devanagari">
            {t("estimates.title")}
          </h1>
          <p className="text-sm text-anumaan-charcoal-500 font-devanagari mt-0.5">
            {t("estimates.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-anumaan-gold-600 text-white font-semibold text-xs hover:bg-anumaan-gold-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          {t("estimates.create_new")}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-xl border border-anumaan-border shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-anumaan-charcoal-400" />
          <input
            type="text"
            placeholder={t("estimates.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-anumaan-border rounded-lg bg-anumaan-beige-50/50 text-anumaan-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-anumaan-gold-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-700"
        >
          <option value="">{t("estimates.all_statuses")}</option>
          <option value="draft">{t("estimates.status_draft")}</option>
          <option value="submitted">{t("estimates.status_submitted")}</option>
          <option value="approved">{t("estimates.status_approved")}</option>
          <option value="archived">{t("estimates.status_archived")}</option>
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-700"
        >
          <option value="">{t("estimates.all_categories")}</option>
          <option value="building">{t("projectType.building")}</option>
          <option value="road">{t("projectType.road")}</option>
        </select>

        {/* Project Filter */}
        {projects.length > 0 && (
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-700 max-w-[180px] truncate"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1 font-semibold hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-anumaan-border bg-white animate-pulse space-y-3"
            >
              <div className="h-4 bg-anumaan-beige-200 rounded w-1/3" />
              <div className="h-6 bg-anumaan-beige-200 rounded w-2/3" />
              <div className="h-4 bg-anumaan-beige-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Estimates Grid / List */}
      {!loading && !error && estimates.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-anumaan-border shadow-xs">
          <Calculator className="w-12 h-12 mx-auto text-anumaan-gold-500/60 mb-3" />
          <h3 className="text-base font-semibold text-anumaan-charcoal-900 font-devanagari">
            {t("estimates.empty_title")}
          </h3>
          <p className="text-xs text-anumaan-charcoal-500 max-w-sm mx-auto mt-1 mb-5">
            {t("estimates.empty_desc")}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-anumaan-gold-600 text-white font-semibold text-xs hover:bg-anumaan-gold-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            {t("estimates.create_new")}
          </button>
        </div>
      )}

      {!loading && !error && estimates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {estimates.map((est) => (
            <Link
              key={est.id}
              href={`/estimates/${est.id}`}
              className="group block p-5 rounded-xl bg-white border border-anumaan-border hover:border-anumaan-gold-500/60 hover:shadow-md transition-all duration-150"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-semibold text-anumaan-gold-700 bg-anumaan-gold-50 px-2 py-0.5 rounded border border-anumaan-gold-500/30">
                  {est.estimate_number}
                </span>
                {getStatusBadge(est.status)}
              </div>

              <h3 className="font-bold text-sm text-anumaan-charcoal-900 group-hover:text-anumaan-gold-700 transition-colors line-clamp-1 mb-1">
                {est.name}
              </h3>

              <div className="text-xs text-anumaan-charcoal-500 mb-3 flex items-center gap-1.5">
                {est.category === "road" ? (
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Building className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span className="truncate">{est.project_name || "Linked Project"}</span>
              </div>

              <div className="pt-3 border-t border-anumaan-border-light flex items-end justify-between">
                <div>
                  <span className="text-[11px] text-anumaan-charcoal-400 block">
                    {est.item_count || 0} {t("estimates.items_count")}
                  </span>
                  <span className="text-base font-bold font-mono text-anumaan-charcoal-900">
                    {formatIndianCurrency(est.total_amount)}
                  </span>
                </div>

                <div className="text-xs font-semibold text-anumaan-gold-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View BOQ <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Estimate Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={t("estimates.create_new")}
          maxWidth="lg"
        >
          <form onSubmit={handleCreateEstimate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 mb-1">
                {t("estimates.name")} *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ground Floor RCC & Masonry Estimate"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-2 text-anumaan-charcoal-900 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-anumaan-charcoal-700 mb-1">
                  {t("estimates.linked_project")} *
                </label>
                <select
                  required
                  value={createForm.project_id}
                  onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                  className="w-full text-xs border border-anumaan-border rounded-lg px-3 py-2 bg-white text-anumaan-charcoal-900"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.project_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-anumaan-charcoal-700 mb-1">
                  {t("estimates.estimate_number")} (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if blank"
                  value={createForm.estimate_number}
                  onChange={(e) => setCreateForm({ ...createForm, estimate_number: e.target.value })}
                  className="w-full text-xs border border-anumaan-border rounded-lg px-3 py-2 font-mono text-anumaan-charcoal-900 bg-white"
                />
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 mb-1">
                {t("estimates.category")} *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, category: "building" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    createForm.category === "building"
                      ? "border-anumaan-gold-500 bg-anumaan-gold-50/60 text-anumaan-charcoal-900"
                      : "border-anumaan-border bg-white text-anumaan-charcoal-600 hover:bg-anumaan-beige-50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <Building className="w-4 h-4 text-amber-600" />
                    {t("projectType.building")}
                  </div>
                  <p className="text-[11px] text-anumaan-charcoal-500 leading-tight">
                    {t("estimates.building_desc")}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, category: "road" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    createForm.category === "road"
                      ? "border-anumaan-gold-500 bg-anumaan-gold-50/60 text-anumaan-charcoal-900"
                      : "border-anumaan-border bg-white text-anumaan-charcoal-600 hover:bg-anumaan-beige-50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <Car className="w-4 h-4 text-blue-600" />
                    {t("projectType.road")}
                  </div>
                  <p className="text-[11px] text-anumaan-charcoal-500 leading-tight">
                    {t("estimates.road_desc")}
                  </p>
                </button>
              </div>
            </div>

            {/* Configurable Rates */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-anumaan-border-light">
              <div>
                <label className="block text-[11px] text-anumaan-charcoal-600 mb-1">Overhead %</label>
                <input
                  type="number"
                  step="0.5"
                  value={createForm.overhead_pct}
                  onChange={(e) => setCreateForm({ ...createForm, overhead_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs border border-anumaan-border rounded px-2 py-1 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-anumaan-charcoal-600 mb-1">Contingency %</label>
                <input
                  type="number"
                  step="0.5"
                  value={createForm.contingency_pct}
                  onChange={(e) => setCreateForm({ ...createForm, contingency_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs border border-anumaan-border rounded px-2 py-1 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-anumaan-charcoal-600 mb-1">Discount %</label>
                <input
                  type="number"
                  step="0.5"
                  value={createForm.discount_pct}
                  onChange={(e) => setCreateForm({ ...createForm, discount_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs border border-anumaan-border rounded px-2 py-1 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-anumaan-charcoal-600 mb-1">GST %</label>
                <input
                  type="number"
                  step="1"
                  value={createForm.gst_pct}
                  onChange={(e) => setCreateForm({ ...createForm, gst_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs border border-anumaan-border rounded px-2 py-1 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-anumaan-border-light">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-anumaan-border bg-white text-anumaan-charcoal-700 hover:bg-anumaan-beige-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting || !createForm.name.trim() || !createForm.project_id}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-anumaan-gold-600 text-white hover:bg-anumaan-gold-700 disabled:opacity-50"
              >
                {submitting ? "Creating..." : t("estimates.create_new")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
