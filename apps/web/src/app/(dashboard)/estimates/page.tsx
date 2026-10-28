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
import { formatIndianCurrency, calculateQuickEstimate, calculateBoundaryWall } from "../../../lib/calculations";
import { Zap, Sparkles, Layers, ShieldCheck, MapPin } from "lucide-react";
import { ContractorRatesSection } from "../../../components/ContractorRatesSection";

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
  const [estimationMode, setEstimationMode] = useState<"quick" | "detailed" | "boundary_wall">("quick");
  const [quickArea, setQuickArea] = useState<number>(1000);
  const [quickFloors, setQuickFloors] = useState<number>(1);
  const [quickTier, setQuickTier] = useState<"economy" | "standard" | "luxury">("standard");

  // Boundary wall inputs
  const [wallLength, setWallLength] = useState<number>(30);
  const [wallHeight, setWallHeight] = useState<number>(2.1);
  const [wallThickness, setWallThickness] = useState<number>(230);
  const [gateWidth, setGateWidth] = useState<number>(3.0);
  const [gateHeight, setGateHeight] = useState<number>(2.0);

  const [createForm, setCreateForm] = useState({
    name: "",
    project_id: "",
    category: "building" as "building" | "road",
    estimate_number: "",
    overhead_pct: 0,
    contingency_pct: 0,
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
      const selectedProj = projects.find((p) => p.id === createForm.project_id);
      const projRegion = selectedProj?.state?.toLowerCase().includes("maharashtra")
        ? "maharashtra_pwd"
        : selectedProj?.state?.toLowerCase().includes("karnataka")
        ? "karnataka_pwd"
        : "national_cpwd";

      const created = await api.createEstimate(currentOrg.id, {
        name: createForm.name.trim(),
        project_id: createForm.project_id,
        category: createForm.category,
        estimate_number: createForm.estimate_number.trim() || undefined,
        overhead_pct: Number(createForm.overhead_pct) || 0,
        contingency_pct: Number(createForm.contingency_pct) || 0,
        discount_pct: 0,
        gst_pct: Number(createForm.gst_pct) || 0,
        notes: createForm.notes.trim() || undefined,
      });

      // If Quick Estimate or Boundary Wall, automatically calculate and populate initial BOQ items
      if (estimationMode === "quick" && createForm.category === "building") {
        try {
          const quick = calculateQuickEstimate(quickArea, quickFloors, quickTier, projRegion);
          const initialItems = [
            {
              item_number: "1.1",
              description: `Foundation Earthwork Excavation for ${quickArea} sq.ft (${quickTier} spec)`,
              category: "earthwork",
              quantity: Math.round(quickArea * quickFloors * 0.015 * 100) / 100,
              unit: "cum",
              unit_rate: projRegion === "maharashtra_pwd" ? 220 : 210,
              amount: 0,
              is_manual: false,
              calculation_type: "quick_building",
            },
            {
              item_number: "2.1",
              description: "Plain Cement Concrete (PCC 1:4:8) Bed in Foundation",
              category: "concrete",
              quantity: Math.round(quickArea * quickFloors * 0.012 * 100) / 100,
              unit: "cum",
              unit_rate: projRegion === "maharashtra_pwd" ? 4850 : 4650,
              amount: 0,
              is_manual: false,
              calculation_type: "quick_building",
            },
            {
              item_number: "3.1",
              description: "Reinforced Cement Concrete (RCC M20/M25) Frame (Columns, Beams, Slabs)",
              category: "concrete",
              quantity: Math.round(quickArea * quickFloors * 0.055 * 100) / 100,
              unit: "cum",
              unit_rate: projRegion === "maharashtra_pwd" ? 6850 : 6500,
              amount: 0,
              is_manual: false,
              calculation_type: "quick_building",
            },
            {
              item_number: "4.1",
              description: "TMT Fe 500D Reinforcement Steel Rebar (Cut, Bend & Fix in Position)",
              category: "reinforcement",
              quantity: quick.steelTonnes,
              unit: "tonne",
              unit_rate: projRegion === "maharashtra_pwd" ? 68500 : 66000,
              amount: 0,
              is_manual: false,
              calculation_type: "quick_building",
            },
            {
              item_number: "5.1",
              description: "Red Clay Brick Masonry 230mm in Cement Mortar 1:6",
              category: "brickwork",
              quantity: Math.round(quickArea * quickFloors * 0.04 * 100) / 100,
              unit: "cum",
              unit_rate: projRegion === "maharashtra_pwd" ? 5200 : 4950,
              amount: 0,
              is_manual: false,
              calculation_type: "quick_building",
            },
            {
              item_number: "6.1",
              description: "Internal & External Cement Plastering 1:4 (12mm/20mm)",
              category: "plaster",
              quantity: Math.round(quickArea * quickFloors * 0.23 * 100) / 100,
              unit: "sqm",
              unit_rate: projRegion === "maharashtra_pwd" ? 285 : 265,
              amount: 0,
              is_manual: false,
              calculation_type: "quick_building",
            },
            {
              item_number: "7.1",
              description: "Vitrified Ceramic Floor Tiles 600x600mm with Grouting",
              category: "finishing",
              quantity: Math.round(quickArea * quickFloors * 0.08 * 100) / 100,
              unit: "sqm",
              unit_rate: projRegion === "maharashtra_pwd" ? 950 : 900,
              amount: 0,
              is_manual: false,
              calculation_type: "quick_building",
            },
          ].map((it) => ({ ...it, amount: Math.round(it.quantity * it.unit_rate * 100) / 100 }));

          await api.saveBOQItems(currentOrg.id, created.id, initialItems as any);
        } catch (seedErr) {
          console.warn("Could not seed initial quick BOQ items:", seedErr);
        }
      } else if (estimationMode === "boundary_wall") {
        try {
          const bw = calculateBoundaryWall(wallLength, wallHeight, wallThickness, "clay_brick", gateWidth, gateHeight);
          const initialItems = [
            {
              item_number: "1.1",
              description: `Boundary Wall Excavation in Soil (${wallLength}m × 0.8m depth)`,
              category: "earthwork",
              quantity: bw.breakdown.excavation_cum,
              unit: "cum",
              unit_rate: 220,
              amount: 0,
              is_manual: false,
              calculation_type: "boundary_wall",
            },
            {
              item_number: "2.1",
              description: "PCC 1:4:8 Bed Concrete in Foundation Trench (150mm thick)",
              category: "concrete",
              quantity: bw.breakdown.pcc_cum,
              unit: "cum",
              unit_rate: 4850,
              amount: 0,
              is_manual: false,
              calculation_type: "boundary_wall",
            },
            {
              item_number: "3.1",
              description: `Boundary Wall Masonry ${wallThickness}mm in 1:6 Cement Mortar (~${bw.breakdown.bricks_count} bricks)`,
              category: "brickwork",
              quantity: bw.breakdown.masonry_volume_cum,
              unit: "cum",
              unit_rate: 5200,
              amount: 0,
              is_manual: false,
              calculation_type: "boundary_wall",
            },
            {
              item_number: "4.1",
              description: "15mm Cement Plaster 1:4 on Both Sides of Boundary Wall & Coping",
              category: "plaster",
              quantity: bw.breakdown.plaster_sqm,
              unit: "sqm",
              unit_rate: 285,
              amount: 0,
              is_manual: false,
              calculation_type: "boundary_wall",
            },
          ].map((it) => ({ ...it, amount: Math.round(it.quantity * it.unit_rate * 100) / 100 }));

          await api.saveBOQItems(currentOrg.id, created.id, initialItems as any);
        } catch (bwErr) {
          console.warn("Could not seed boundary wall items:", bwErr);
        }
      }

      setShowCreateModal(false);
      setCreateForm({
        name: "",
        project_id: projects[0]?.id || "",
        category: "building",
        estimate_number: "",
        overhead_pct: 0,
        contingency_pct: 0,
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
          <h1 className="text-2xl font-bold text-[#102F57] font-heading font-devanagari">
            {t("estimates.title")}
          </h1>
          <p className="text-sm text-[#64748B] font-devanagari mt-0.5">
            {t("estimates.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn-accent px-4 py-2 rounded-lg text-xs inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("estimates.create_new")}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-xl border border-[#DCE4EE] shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder={t("estimates.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#DCE4EE] rounded-lg bg-[#F3F6FA] text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs border border-[#DCE4EE] rounded-lg px-3 py-1.5 bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
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
          className="text-xs border border-[#DCE4EE] rounded-lg px-3 py-1.5 bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
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
            className="text-xs border border-[#DCE4EE] rounded-lg px-3 py-1.5 bg-white text-[#263445] max-w-[180px] truncate focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
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
        <div className="p-12 text-center bg-white rounded-xl border border-[#DCE4EE] shadow-sm">
          <Calculator className="w-12 h-12 mx-auto text-[#102F57]/40 mb-3" />
          <h3 className="text-base font-semibold text-[#102F57] font-devanagari">
            {t("estimates.empty_title")}
          </h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-5">
            {t("estimates.empty_desc")}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-accent px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5"
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
              className="group block p-5 rounded-xl bg-white border border-[#DCE4EE] hover:border-[#102F57]/60 hover:shadow-md transition-all duration-150"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-semibold text-[#102F57] bg-[#EEF3F9] px-2 py-0.5 rounded border border-[#DCE4EE]">
                  {est.estimate_number}
                </span>
                {getStatusBadge(est.status)}
              </div>

              <h3 className="font-bold text-sm text-[#263445] group-hover:text-[#102F57] transition-colors line-clamp-1 mb-1">
                {est.name}
              </h3>

              <div className="text-xs text-[#64748B] mb-3 flex items-center gap-1.5">
                {est.category === "road" ? (
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Building className="w-3.5 h-3.5 text-[#F7931E]" />
                )}
                <span className="truncate">{est.project_name || "Linked Project"}</span>
              </div>

              <div className="pt-3 border-t border-[#DCE4EE] flex items-end justify-between">
                <div>
                  <span className="text-[11px] text-[#64748B] block">
                    {est.item_count || 0} {t("estimates.items_count")}
                  </span>
                  <span className="text-base font-bold font-mono text-[#102F57]">
                    {formatIndianCurrency(est.total_amount)}
                  </span>
                </div>

                <div className="text-xs font-semibold text-[#F7931E] group-hover:text-[#102F57] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
            {/* Estimation Mode Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#263445] mb-1.5 uppercase tracking-wider">
                Select Estimation Workflow Mode *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEstimationMode("quick")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    estimationMode === "quick"
                      ? "border-[#F7931E] bg-[#FFF6EB] text-[#102F57] shadow-2xs ring-1 ring-[#F7931E]"
                      : "border-[#DCE4EE] bg-white text-[#64748B] hover:bg-[#F3F6FA]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#102F57]">
                    <Zap className="w-3.5 h-3.5 text-[#F7931E]" />
                    <span>Quick Estimate</span>
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-1 leading-snug">
                    Instant budget & material takeoff from built-up area and quality tier.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEstimationMode("detailed")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    estimationMode === "detailed"
                      ? "border-[#F7931E] bg-[#FFF6EB] text-[#102F57] shadow-2xs ring-1 ring-[#F7931E]"
                      : "border-[#DCE4EE] bg-white text-[#64748B] hover:bg-[#F3F6FA]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#102F57]">
                    <Layers className="w-3.5 h-3.5 text-[#102F57]" />
                    <span>Detailed BOQ</span>
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-1 leading-snug">
                    Enter individual dimensional formulas, drawings, or line-by-line items.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEstimationMode("boundary_wall")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    estimationMode === "boundary_wall"
                      ? "border-[#F7931E] bg-[#FFF6EB] text-[#102F57] shadow-2xs ring-1 ring-[#F7931E]"
                      : "border-[#DCE4EE] bg-white text-[#64748B] hover:bg-[#F3F6FA]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#102F57]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Boundary Wall</span>
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-1 leading-snug">
                    Dedicated wall length, height, gate deduction, coping & foundation.
                  </p>
                </button>
              </div>
            </div>

            {/* Quick Estimate Inputs & Material Takeoff Preview */}
            {estimationMode === "quick" && (
              <div className="p-3.5 bg-[#F3F6FA] border border-[#DCE4EE] rounded-xl space-y-3">
                <div className="text-xs font-bold text-[#102F57] flex items-center justify-between">
                  <span>Quick Building Parameters (Area & Quality)</span>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                    Preliminary Benchmark
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#263445] mb-1">
                      Built-up Area (sq.ft) *
                    </label>
                    <input
                      type="number"
                      min="50"
                      value={quickArea}
                      onChange={(e) => setQuickArea(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs border border-[#DCE4EE] rounded-lg px-2.5 py-1.5 font-mono text-[#102F57] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#263445] mb-1">
                      Number of Floors
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={quickFloors}
                      onChange={(e) => setQuickFloors(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs border border-[#DCE4EE] rounded-lg px-2.5 py-1.5 font-mono text-[#102F57] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#263445] mb-1">
                      Quality Specification
                    </label>
                    <select
                      value={quickTier}
                      onChange={(e) => setQuickTier(e.target.value as any)}
                      className="w-full text-xs border border-[#DCE4EE] rounded-lg px-2.5 py-1.5 bg-white text-[#102F57] font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    >
                      <option value="economy">Economy (₹1,550/sqft base)</option>
                      <option value="standard">Standard (₹2,100/sqft base)</option>
                      <option value="luxury">Luxury (₹2,950/sqft base)</option>
                    </select>
                  </div>
                </div>

                {/* Live Preview Card */}
                {(() => {
                  const qPreview = calculateQuickEstimate(quickArea, quickFloors, quickTier);
                  return (
                    <div className="p-2.5 bg-white border border-[#DCE4EE] rounded-lg space-y-1.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-[#102F57]">
                        <span>Estimated Total Budget:</span>
                        <span className="font-mono text-sm text-[#16835D]">
                          {formatIndianCurrency(qPreview.totalCost)} (₹{qPreview.costPerSqft}/sq.ft)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] text-[#64748B] pt-1 border-t border-[#EEF3F9]">
                        <div>Cement: <strong className="text-[#102F57]">{qPreview.cementBags} bags</strong></div>
                        <div>Steel: <strong className="text-[#102F57]">{qPreview.steelTonnes} t</strong></div>
                        <div>Sand: <strong className="text-[#102F57]">{qPreview.sandBrass} brass</strong></div>
                        <div>Agg: <strong className="text-[#102F57]">{qPreview.aggBrass} brass</strong></div>
                        <div>Bricks: <strong className="text-[#102F57]">~{qPreview.bricksCount} nos</strong></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Boundary Wall Inputs */}
            {estimationMode === "boundary_wall" && (
              <div className="p-3.5 bg-[#F3F6FA] border border-[#DCE4EE] rounded-xl space-y-3">
                <div className="text-xs font-bold text-[#102F57] flex items-center justify-between">
                  <span>Boundary Wall Dimensions & Openings</span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                    IS 1200 Part III
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#263445] mb-1">
                      Length (m) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={wallLength}
                      onChange={(e) => setWallLength(Math.max(1, Number(e.target.value)))}
                      className="w-full text-xs border border-[#DCE4EE] rounded-lg px-2.5 py-1.5 font-mono text-[#102F57] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#263445] mb-1">
                      Height (m) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={wallHeight}
                      onChange={(e) => setWallHeight(Math.max(0.5, Number(e.target.value)))}
                      className="w-full text-xs border border-[#DCE4EE] rounded-lg px-2.5 py-1.5 font-mono text-[#102F57] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#263445] mb-1">
                      Thickness (mm)
                    </label>
                    <select
                      value={wallThickness}
                      onChange={(e) => setWallThickness(Number(e.target.value))}
                      className="w-full text-xs border border-[#DCE4EE] rounded-lg px-2.5 py-1.5 bg-white text-[#102F57] font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    >
                      <option value="230">230mm (9 inch Brick)</option>
                      <option value="150">150mm (AAC / Block)</option>
                      <option value="115">115mm (4.5 inch Partition)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#263445] mb-1">
                      Gate Opening (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={gateWidth}
                      onChange={(e) => setGateWidth(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs border border-[#DCE4EE] rounded-lg px-2.5 py-1.5 font-mono text-[#102F57] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                      placeholder="Width (m)"
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#263445] mb-1">
                {t("estimates.name")} *
              </label>
              <input
                type="text"
                required
                placeholder={t("estimates.estimate_name_placeholder") || "e.g. Ground Floor RCC & Masonry Estimate"}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full text-sm border border-[#DCE4EE] rounded-lg px-3 py-2 text-[#263445] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#263445] mb-1">
                  {t("estimates.linked_project")} *
                </label>
                <select
                  required
                  value={createForm.project_id}
                  onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}
                  className="w-full text-xs border border-[#DCE4EE] rounded-lg px-3 py-2 bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.project_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#263445] mb-1">
                  {t("estimates.estimate_number")} ({t("common.optional")})
                </label>
                <input
                  type="text"
                  placeholder={t("estimates.estimate_number_placeholder") || "Auto-generated if blank"}
                  value={createForm.estimate_number}
                  onChange={(e) => setCreateForm({ ...createForm, estimate_number: e.target.value })}
                  className="w-full text-xs border border-[#DCE4EE] rounded-lg px-3 py-2 font-mono text-[#263445] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                />
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#263445] mb-1">
                {t("estimates.category")} *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, category: "building" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    createForm.category === "building"
                      ? "border-[#F7931E] bg-[#FFF6EB] text-[#102F57] shadow-sm"
                      : "border-[#DCE4EE] bg-white text-[#64748B] hover:bg-[#F3F6FA]"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <Building className="w-4 h-4 text-[#F7931E]" />
                    {t("projectType.building")}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-tight">
                    {t("estimates.building_desc")}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, category: "road" })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    createForm.category === "road"
                      ? "border-[#F7931E] bg-[#FFF6EB] text-[#102F57] shadow-sm"
                      : "border-[#DCE4EE] bg-white text-[#64748B] hover:bg-[#F3F6FA]"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <Car className="w-4 h-4 text-blue-600" />
                    {t("projectType.road")}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-tight">
                    {t("estimates.road_desc")}
                  </p>
                </button>
              </div>
            </div>

            {/* Contractor Friendly Configurable Rates */}
            <div className="pt-2 border-t border-[#DCE4EE]">
              <ContractorRatesSection
                values={{
                  overheadPct: createForm.overhead_pct,
                  contingencyPct: createForm.contingency_pct,
                  gstPct: createForm.gst_pct,
                }}
                onChange={(newRates) =>
                  setCreateForm({
                    ...createForm,
                    overhead_pct: newRates.overheadPct,
                    contingency_pct: newRates.contingencyPct,
                    gst_pct: newRates.gstPct,
                  })
                }
                compact={true}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE4EE]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary px-4 py-2 text-xs rounded-lg"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting || !createForm.name.trim() || !createForm.project_id}
                className="btn-accent px-4 py-2 text-xs rounded-lg disabled:opacity-50"
              >
                {submitting ? (t("common.loading") || "Creating...") : t("estimates.create_new")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
