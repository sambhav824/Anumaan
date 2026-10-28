"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Lock,
  Building,
  Car,
  AlertCircle,
  FileCheck,
  Send,
  Archive,
  RotateCcw,
  RefreshCw,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Minus,
  Plus,
  Trash2,
  FileUp,
  ExternalLink,
  Receipt,
  Layers,
  Calendar,
  DollarSign,
  AlertTriangle,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "../../../../context/I18nContext";
import { useOrg } from "../../../../context/OrgContext";
import {
  api,
  Estimate,
  BOQItem,
  ActualExpense,
  CostVarianceSummary,
} from "../../../../lib/api";
import { BOQTable } from "../../../../components/BOQTable";
import { Modal } from "../../../../components/Modal";
import { formatIndianCurrency, formatCurrencyINR } from "../../../../lib/calculations";

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params?.id as string;

  const { t } = useTranslation();
  const { currentOrg } = useOrg();

  const [activeTab, setActiveTab] = useState<"boq" | "actuals">("boq");

  // Estimate & BOQ State
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [items, setItems] = useState<BOQItem[]>([]);
  const [overheadPct, setOverheadPct] = useState<number>(0);
  const [contingencyPct, setContingencyPct] = useState<number>(0);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [gstPct, setGstPct] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expense Tracking State
  const [expenses, setExpenses] = useState<ActualExpense[]>([]);
  const [variance, setVariance] = useState<CostVarianceSummary | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "material" as "material" | "labour" | "equipment" | "transport" | "subcontract" | "other",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    vendor_or_payee: "",
    invoice_or_voucher_ref: "",
    notes: "",
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Drawing AI Modal State
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [analyzingDrawing, setAnalyzingDrawing] = useState(false);
  const [drawingAnalysisResult, setDrawingAnalysisResult] = useState<any | null>(null);
  const [drawingError, setDrawingError] = useState<string | null>(null);

  const loadEstimate = useCallback(async () => {
    if (!currentOrg?.id || !estimateId) return;
    try {
      setLoading(true);
      setError(null);
      const est = await api.getEstimate(currentOrg.id, estimateId);
      setEstimate(est);
      setItems(est.items || []);
      setOverheadPct(Number(est.overhead_pct) || 0);
      setContingencyPct(Number(est.contingency_pct) || 0);
      setDiscountPct(Number(est.discount_pct) || 0);
      setGstPct(est.gst_pct !== undefined && est.gst_pct !== null ? Number(est.gst_pct) : 0);
    } catch (err: any) {
      console.error("Failed to load estimate:", err);
      setError(err?.message || "Failed to load estimate details.");
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id, estimateId]);

  const loadExpensesAndVariance = useCallback(async () => {
    if (!currentOrg?.id || !estimateId) return;
    try {
      setLoadingExpenses(true);
      const [expList, varSummary] = await Promise.all([
        api.listExpenses(currentOrg.id, estimateId),
        api.getExpenseVariance(currentOrg.id, estimateId),
      ]);
      setExpenses(expList);
      setVariance(varSummary);
    } catch (err) {
      console.error("Failed to load actual expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  }, [currentOrg?.id, estimateId]);

  useEffect(() => {
    loadEstimate();
    loadExpensesAndVariance();
  }, [loadEstimate, loadExpensesAndVariance]);

  const handleSave = async () => {
    if (!currentOrg?.id || !estimateId || !estimate) return;
    try {
      setSaving(true);
      setSaveSuccess(false);

      // 1. Update estimate rates and metadata
      await api.updateEstimate(currentOrg.id, estimateId, {
        overhead_pct: overheadPct,
        contingency_pct: contingencyPct,
        discount_pct: 0,
        gst_pct: gstPct,
      });

      // 2. Save all items transactionally
      const savedItems = await api.saveBOQItems(currentOrg.id, estimateId, items);
      setItems(savedItems);

      // 3. Refresh estimate
      const refreshed = await api.getEstimate(currentOrg.id, estimateId);
      setEstimate(refreshed);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadExpensesAndVariance();
    } catch (err: any) {
      alert(err?.message || "Failed to save estimate");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!currentOrg?.id || !estimateId) return;
    const confirmMsg =
      newStatus === "approved"
        ? "Approve this estimate? A historical snapshot will be frozen and preserved."
        : `Change status to ${newStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSaving(true);
      await api.updateEstimateStatus(currentOrg.id, estimateId, newStatus);
      await loadEstimate();
    } catch (err: any) {
      alert(err?.message || "Failed to update estimate status");
    } finally {
      setSaving(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !estimateId || !expenseForm.description.trim()) return;

    try {
      setSubmittingExpense(true);
      await api.createExpense(currentOrg.id, estimateId, {
        category: expenseForm.category,
        description: expenseForm.description.trim(),
        amount: parseFloat(expenseForm.amount) || 0,
        expense_date: expenseForm.expense_date,
        vendor_or_payee: expenseForm.vendor_or_payee.trim() || undefined,
        invoice_or_voucher_ref: expenseForm.invoice_or_voucher_ref.trim() || undefined,
        notes: expenseForm.notes.trim() || undefined,
      });

      setShowExpenseModal(false);
      setExpenseForm({
        category: "material",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
        vendor_or_payee: "",
        invoice_or_voucher_ref: "",
        notes: "",
      });
      await loadExpensesAndVariance();
    } catch (err: any) {
      console.error("Failed to record expense:", err);
      alert(err?.message || "Failed to record expense");
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentOrg?.id || !estimateId) return;
    if (!window.confirm(t("expenses.deleteConfirm"))) return;
    try {
      await api.deleteExpense(currentOrg.id, estimateId, expenseId);
      await loadExpensesAndVariance();
    } catch (err: any) {
      alert(err?.message || "Failed to delete expense");
    }
  };

  const handleAnalyzeDrawing = async () => {
    if (!currentOrg?.id || !estimateId || !drawingFile) return;
    try {
      setAnalyzingDrawing(true);
      setDrawingError(null);
      const res = await api.analyzeDrawing(currentOrg.id, estimateId, drawingFile);
      setDrawingAnalysisResult(res);
    } catch (err: any) {
      setDrawingError(err?.message || "Failed to analyze drawing");
    } finally {
      setAnalyzingDrawing(false);
    }
  };

  const handleImportTakeoffItems = async () => {
    if (!drawingAnalysisResult || !drawingAnalysisResult.detected_items || drawingAnalysisResult.detected_items.length === 0) return;

    const newBoqItems: BOQItem[] = drawingAnalysisResult.detected_items.map((it: any, idx: number) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.unit_rate) || 0;
      const amt = Math.round(q * r * 100) / 100;
      return {
        item_number: it.item_number || `${items.length + idx + 1}.1`,
        description: it.description,
        category: it.category || "general",
        quantity: q,
        unit: it.unit || "nos",
        unit_rate: r,
        amount: amt,
        is_manual: false,
        calculation_type: "Takeoff",
        calculation_details: {
          formula: (it.assumptions && it.assumptions[0]) || `${q} ${it.unit} @ ₹${r}/${it.unit}`,
          source: drawingAnalysisResult.filename,
        },
      };
    });

    const updated = [...items, ...newBoqItems];
    setItems(updated);

    if (currentOrg?.id && estimateId) {
      try {
        await api.updateEstimate(currentOrg.id, estimateId, {
          items: updated,
        });
      } catch (err) {
        console.error("Failed to persist imported takeoff items:", err);
      }
    }

    setShowDrawingModal(false);
    setDrawingFile(null);
    setDrawingAnalysisResult(null);
  };

  // Real-time Material Takeoff & Cost Classification Engine (IS 1200 / MoRTH Standards)
  const materialSummary = React.useMemo(() => {
    let matSub = 0;
    let labSub = 0;
    let eqSub = 0;
    let compSub = 0;

    let cementBags = 0;
    let steelKg = 0;
    let sandCum = 0;
    let aggCum = 0;
    let bricksNos = 0;
    let bitumenKg = 0;
    let labourDays = 0;

    // Check if separate steel line item exists to avoid double-counting
    const hasDedicatedSteel = items.some((it) => {
      const d = (it.description || "").toLowerCase();
      const u = (it.unit || "").toLowerCase();
      return (
        (d.includes("steel") || d.includes("tmt") || d.includes("rebar") || d.includes("reinforcement")) &&
        (u === "kg" || u === "tonne" || u === "ton" || u === "mt" || u === "qtl")
      );
    });

    for (const it of items) {
      const q = Number(it.quantity) || 0;
      const r = Number(it.unit_rate) || 0;
      const a = Math.round(q * r * 100) / 100;
      const desc = (it.description || "").toLowerCase();
      const cat = (it.category || "").toLowerCase();
      const u = (it.unit || "").toLowerCase();

      // Direct Cost Classification
      if (cat === "labour" || u === "day" || u === "manday" || desc.includes("labour charges") || desc.includes("helper charges")) {
        labSub += a;
        if (u === "day" || u === "manday") labourDays += q;
      } else if (cat === "equipment" || desc.includes("jcb") || desc.includes("compactor") || desc.includes("roller hire")) {
        eqSub += a;
      } else if (
        cat === "concrete" ||
        cat === "masonry" ||
        cat === "plaster" ||
        cat === "flooring" ||
        cat === "road" ||
        cat === "earthwork" ||
        desc.includes("concrete") ||
        desc.includes("masonry") ||
        desc.includes("plastering") ||
        desc.includes("tiling") ||
        desc.includes("macadam")
      ) {
        // Complete composite civil work
        compSub += a;
      } else {
        matSub += a;
      }

      // 1. Raw Materials (Direct Items)
      if (desc.includes("cement") && (u === "bag" || u === "bags")) cementBags += q;
      if ((desc.includes("steel") || desc.includes("tmt") || desc.includes("rebar")) && u === "kg") steelKg += q;
      if ((desc.includes("steel") || desc.includes("tmt") || desc.includes("rebar")) && (u === "tonne" || u === "ton" || u === "mt")) steelKg += q * 1000;
      if ((desc.includes("steel") || desc.includes("tmt") || desc.includes("rebar")) && u === "qtl") steelKg += q * 100;
      if (desc.includes("sand") && (u === "cum" || u === "m3")) sandCum += q;
      if (desc.includes("sand") && (u === "brass" || u === "br")) sandCum += q * 2.8317;
      if (desc.includes("aggregate") && (u === "cum" || u === "m3")) aggCum += q;
      if (desc.includes("aggregate") && (u === "brass" || u === "br")) aggCum += q * 2.8317;
      if ((desc.includes("brick") || desc.includes("block")) && (u === "nos" || u === "no" || u === "piece" || u === "pieces")) bricksNos += q;
      if (desc.includes("bitumen") && (u === "kg" || u === "litre")) bitumenKg += q;
      if (desc.includes("bitumen") && (u === "tonne" || u === "ton")) bitumenKg += q * 1000;

      // 2. Plain Cement Concrete (PCC) Constituent Materials (IS 456 / CPWD)
      if (desc.includes("pcc") || desc.includes("plain cement concrete") || desc.includes("lean concrete")) {
        const is148 = desc.includes("1:4:8");
        const is124 = desc.includes("1:2:4");
        const cBags = is148 ? 3.4 : is124 ? 6.3 : 4.5;
        const sCum = is148 ? 0.47 : 0.45;
        const aCum = is148 ? 0.95 : 0.90;
        cementBags += q * cBags;
        sandCum += q * sCum;
        aggCum += q * aCum;
        labourDays += q * 0.85;
      }

      // 3. Reinforced Cement Concrete (RCC M20/M25/M30) (IS 456:2000)
      if (
        (desc.includes("rcc") || desc.includes("reinforced cement") || desc.includes("m20") || desc.includes("m25") || desc.includes("m30")) &&
        (u === "cum" || u === "m3")
      ) {
        const isM25 = desc.includes("m25");
        const isM30 = desc.includes("m30");
        const cBags = isM30 ? 9.0 : isM25 ? 8.2 : 6.8;
        cementBags += q * cBags;
        sandCum += q * 0.45;
        aggCum += q * 0.85;
        if (!hasDedicatedSteel) {
          steelKg += q * (isM25 ? 85 : 75);
        }
        labourDays += q * 1.80;
      }

      // 4. Brick Masonry / AAC Blocks (IS 1200 Part 3)
      if (desc.includes("brick") || desc.includes("masonry") || desc.includes("aac block")) {
        if (u === "cum" || u === "m3") {
          const isAac = desc.includes("aac");
          if (isAac) {
            bricksNos += q * 55;
            cementBags += q * 0.8;
          } else {
            bricksNos += q * 500;
            const is14 = desc.includes("1:4");
            cementBags += q * (is14 ? 1.8 : 1.25);
            sandCum += q * 0.25;
          }
          labourDays += q * 1.20;
        } else if (u === "sqm" || u === "m2" || u === "sq.m") {
          bricksNos += q * 55;
          cementBags += q * 0.15;
          sandCum += q * 0.03;
          labourDays += q * 0.35;
        }
      }

      // 5. Plastering (IS 1200 Part 12)
      if (desc.includes("plaster") || desc.includes("plastering")) {
        if (u === "sqm" || u === "m2" || u === "sq.m") {
          cementBags += q * 0.14;
          sandCum += q * 0.021;
          labourDays += q * 0.25;
        } else if (u === "cum" || u === "m3") {
          cementBags += q * 6.5;
          sandCum += q * 1.0;
          labourDays += q * 3.0;
        }
      }

      // 6. Flooring & Tiling (IS 1200 Part 11)
      if (desc.includes("tile") || desc.includes("flooring") || desc.includes("vitrified") || desc.includes("ceramic")) {
        if (u === "sqm" || u === "m2" || u === "sq.m") {
          cementBags += q * 0.22;
          sandCum += q * 0.035;
          labourDays += q * 0.35;
        }
      }

      // 7. Road Works (MoRTH Specifications: GSB, WMM, Bituminous DBM/BC)
      if (desc.includes("gsb") || desc.includes("granular sub-base") || desc.includes("sub base")) {
        aggCum += q * 1.25;
        labourDays += q * 0.15;
      }
      if (desc.includes("wmm") || desc.includes("wet mix macadam")) {
        aggCum += q * 1.20;
        labourDays += q * 0.15;
      }
      if (desc.includes("dbm") || desc.includes("dense bituminous") || (desc.includes("bituminous") && desc.includes("binder"))) {
        bitumenKg += q * 108; // 108 kg VG-30 bitumen per cum (4.5% wt of mix)
        aggCum += q * 1.45;
        labourDays += q * 0.20;
      }
      if (desc.includes("bc") || desc.includes("bituminous concrete") || desc.includes("wearing course")) {
        if (u === "sqm" || u === "m2") {
          bitumenKg += q * 3.6; // 3.6 kg bitumen per sqm for 30mm/40mm layer
          aggCum += q * 0.045;
          labourDays += q * 0.03;
        } else {
          bitumenKg += q * 120;
          aggCum += q * 1.45;
          labourDays += q * 0.20;
        }
      }
      if (desc.includes("prime coat") || desc.includes("tack coat")) {
        bitumenKg += q * (desc.includes("prime") ? 0.75 : 0.25);
      }

      // 8. Earthwork Excavation Benchmarks
      if (desc.includes("excavat") || desc.includes("earthwork")) {
        if (u === "cum" || u === "m3") {
          labourDays += q * 0.18;
        }
      }
    }

    return {
      matSub,
      labSub,
      eqSub,
      compSub,
      cementBags: Math.round(cementBags),
      steelTonnes: Math.round((steelKg / 1000) * 100) / 100,
      steelKg: Math.round(steelKg),
      sandCum: Math.round(sandCum * 10) / 10,
      aggCum: Math.round(aggCum * 10) / 10,
      bricksNos: Math.round(bricksNos),
      bitumenKg: Math.round(bitumenKg),
      bitumenTonnes: Math.round((bitumenKg / 1000) * 100) / 100,
      labourDays: Math.round(labourDays),
    };
  }, [items]);

  const isLocked = estimate?.status === "approved";

  return (
    <div className="space-y-6">
      {/* Top Header & Contractor Primary Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/estimates"
            className="p-1.5 rounded-lg border border-[#DCE4EE] bg-white text-[#102F57] hover:bg-[#F3F6FA] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#102F57] font-heading font-devanagari">
                {estimate?.name || t("estimates.name")}
              </h1>
              {estimate?.estimate_number && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#EEF3F9] border border-[#DCE4EE] text-[#102F57]">
                  {estimate.estimate_number}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
              <span>{estimate?.project_name}</span>
              <span>•</span>
              <span className="capitalize">
                {estimate?.category ? `${t(`projectType.${estimate.category}`)} ${t("common.construction")}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 font-devanagari">
          {/* AI Drawing Vision Analyzer */}
          <button
            type="button"
            onClick={() => setShowDrawingModal(true)}
            className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <FileUp className="w-3.5 h-3.5 text-[#F7931E]" />
            {t("drawings.modalTitle")}
          </button>

          {/* Quotations shortcut */}
          <Link
            href={`/quotations?estimate_id=${estimateId}`}
            className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#102F57]" />
            {t("nav.quotations")}
          </Link>

          {estimate?.status === "draft" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("submitted")}
              disabled={saving}
              className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {t("estimates.submit")}
            </button>
          )}

          {estimate?.status === "submitted" && (
            <>
              <button
                type="button"
                onClick={() => handleStatusTransition("draft")}
                disabled={saving}
                className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t("estimates.reopen")}
              </button>
              <button
                type="button"
                onClick={() => handleStatusTransition("approved")}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#16835D] text-white hover:bg-[#126b4c] transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("estimates.approve")}
              </button>
            </>
          )}

          {estimate?.status === "approved" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("draft")}
              disabled={saving}
              className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("estimates.reopen")}
            </button>
          )}

          {!isLocked && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-accent px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? t("common.saving") : saveSuccess ? t("common.saved") : t("estimates.save_draft")}
            </button>
          )}
        </div>
      </div>

      {/* Snapshot Preserved Notice */}
      {estimate?.snapshot && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{t("estimates.snapshot_notice")}</span>
          </div>
          <span className="font-mono text-[11px] text-amber-700">
            {t("estimates.frozen")} {new Date(estimate.snapshot.frozen_at).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadEstimate}
            className="flex items-center gap-1 font-semibold hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {t("common.retry")}
          </button>
        </div>
      )}

      {/* Tab Navigation: BOQ Sheet vs Actual Cost Tracking */}
      <div className="border-b border-[#DCE4EE] flex items-center gap-4 text-sm font-devanagari">
        <button
          onClick={() => setActiveTab("boq")}
          className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === "boq"
              ? "border-[#F7931E] text-[#102F57]"
              : "border-transparent text-[#64748B] hover:text-[#102F57]"
          }`}
        >
          <Layers className="w-4 h-4 text-[#F7931E]" />
          {t("expenses.boqTabTitle")}
          <span className="px-1.5 py-0.5 rounded text-[11px] bg-[#EEF3F9] text-[#102F57] font-mono">
            {items.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("actuals")}
          className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === "actuals"
              ? "border-[#F7931E] text-[#102F57]"
              : "border-transparent text-[#64748B] hover:text-[#102F57]"
          }`}
        >
          <Receipt className="w-4 h-4 text-[#F7931E]" />
          {t("expenses.tabTitle")}
          {variance && (
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                variance.status === "over_budget"
                  ? "bg-red-100 text-red-700"
                  : variance.status === "under_budget"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {variance.status === "over_budget" ? "+ " : ""}
              {Number(variance.variance_pct).toFixed(1)}%
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BOQ Table Editor */}
      {activeTab === "boq" && !loading && !error && estimate && (
        <div className="space-y-4">
          {/* Executive Material Takeoff & Cost Classification Cards */}
          <div className="p-4 bg-white border border-[#DCE4EE] rounded-2xl shadow-xs space-y-3 font-devanagari">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-[#EEF3F9]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#FFF6EB] text-[#F7931E]">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#102F57] font-heading">
                    Executive Material Requirements & Direct Cost Breakdown
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Calculated in real-time from your BOQ quantities and editable unit rates.
                  </p>
                </div>
              </div>

              {/* Regional Pricing Benchmark Tag */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F3F6FA] text-[#102F57] border border-[#DCE4EE]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16835D]" />
                <span>Regional Pricing Active</span>
              </div>
            </div>

            {/* Material Quantities KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Cement</span>
                <span className="text-base font-bold font-mono text-[#102F57]">{materialSummary.cementBags}</span>
                <span className="text-[10px] text-[#64748B]"> bags (50kg)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Steel Rebar</span>
                <span className="text-base font-bold font-mono text-[#102F57]">{materialSummary.steelTonnes}</span>
                <span className="text-[10px] text-[#64748B]"> tonnes ({materialSummary.steelKg} kg)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Sand</span>
                <span className="text-base font-bold font-mono text-[#102F57]">{materialSummary.sandCum}</span>
                <span className="text-[10px] text-[#64748B]"> cum (washed)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Aggregates / GSB</span>
                <span className="text-base font-bold font-mono text-[#102F57]">{materialSummary.aggCum}</span>
                <span className="text-[10px] text-[#64748B]"> cum (10/20/40mm)</span>
              </div>

              {materialSummary.bitumenKg > 0 ? (
                <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Bitumen / Asphalt</span>
                  <span className="text-base font-bold font-mono text-[#102F57]">{materialSummary.bitumenTonnes}</span>
                  <span className="text-[10px] text-[#64748B]"> tonnes ({materialSummary.bitumenKg} kg)</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Bricks / AAC</span>
                  <span className="text-base font-bold font-mono text-[#102F57]">{materialSummary.bricksNos}</span>
                  <span className="text-[10px] text-[#64748B]"> nos / units</span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Total Labour</span>
                <span className="text-base font-bold font-mono text-[#102F57]">{materialSummary.labourDays}</span>
                <span className="text-[10px] text-[#64748B]"> worker days</span>
              </div>
            </div>

            {/* Direct Cost Distribution Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#EEF3F9] text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                <span className="text-[11px] text-blue-900 font-semibold">Materials Direct:</span>
                <span className="font-mono font-bold text-blue-900">₹{materialSummary.matSub.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-teal-50/60 border border-teal-100">
                <span className="text-[11px] text-teal-900 font-semibold">Labour Direct:</span>
                <span className="font-mono font-bold text-teal-900">₹{materialSummary.labSub.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="text-[11px] text-amber-900 font-semibold">Machinery & Plant:</span>
                <span className="font-mono font-bold text-amber-900">₹{materialSummary.eqSub.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50/60 border border-purple-100">
                <span className="text-[11px] text-purple-900 font-semibold">Composite Works:</span>
                <span className="font-mono font-bold text-purple-900">₹{materialSummary.compSub.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Double Counting Prevention Warning */}
            {materialSummary.compSub > 0 && materialSummary.matSub > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Anti-Double-Counting Notice:</strong> Your BOQ contains composite completed-work items (which bundle materials & labour) alongside raw materials. Verify items to avoid double-charging clients.
                </span>
              </div>
            )}
          </div>

          <BOQTable
          items={items}
          onItemsChange={setItems}
          organizationId={currentOrg?.id}
          overheadPct={overheadPct}
          contingencyPct={contingencyPct}
          gstPct={gstPct}
          onPercentagesChange={(rates) => {
            setOverheadPct(rates.overheadPct);
            setContingencyPct(rates.contingencyPct);
            setGstPct(rates.gstPct);
          }}
          readOnly={isLocked}
        />
        </div>
      )}

      {/* TAB 2: Actual Cost Tracking & Variance Analysis */}
      {activeTab === "actuals" && (
        <div className="space-y-6">
          {/* 4 Summary Variance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Estimated Budget */}
            <div className="p-4 rounded-xl bg-white border border-[#DCE4EE] shadow-sm">
              <div className="text-xs font-medium text-[#64748B] font-devanagari">
                {t("expenses.estimatedBudget")}
              </div>
              <div className="text-lg font-bold font-mono text-[#102F57] mt-1">
                {formatCurrencyINR(variance?.estimated_amount || estimate?.total_amount || 0)}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Ref. Estimate {estimate?.estimate_number}
              </div>
            </div>

            {/* 2. Total Actual Spent */}
            <div className="p-4 rounded-xl bg-white border border-[#DCE4EE] shadow-sm">
              <div className="text-xs font-medium text-[#64748B] font-devanagari">
                {t("expenses.actualSpent")}
              </div>
              <div className="text-lg font-bold font-mono text-[#102F57] mt-1">
                {formatCurrencyINR(variance?.actual_amount || 0)}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                {variance?.total_expenses_count || expenses.length} expenses logged
              </div>
            </div>

            {/* 3. Variance Difference */}
            <div className="p-4 rounded-xl bg-white border border-[#DCE4EE] shadow-sm">
              <div className="text-xs font-medium text-[#64748B] font-devanagari">
                {t("expenses.variance")}
              </div>
              <div
                className={`text-lg font-bold font-mono mt-1 ${
                  (variance?.difference || 0) > 0
                    ? "text-[#C62828]"
                    : (variance?.difference || 0) < 0
                    ? "text-[#16835D]"
                    : "text-[#263445]"
                }`}
              >
                {(variance?.difference || 0) > 0 ? "+ " : ""}₹
                {formatCurrencyINR(variance?.difference || 0)}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">
                Variance: {Number(variance?.variance_pct || 0).toFixed(2)}%
              </div>
            </div>

            {/* 4. Status Badge */}
            <div className="p-4 rounded-xl bg-white border border-[#DCE4EE] shadow-sm flex flex-col justify-between">
              <div className="text-xs font-medium text-[#64748B] font-devanagari">
                {t("expenses.status")}
              </div>
              <div className="mt-2">
                {variance?.status === "over_budget" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 font-devanagari">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {t("expenses.overBudget")}
                  </span>
                ) : variance?.status === "under_budget" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 font-devanagari">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {t("expenses.underBudget")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 font-devanagari">
                    <Minus className="w-3.5 h-3.5" />
                    {t("expenses.onBudget")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar & Log Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#102F57] font-devanagari">
              {t("expenses.title")}
            </h3>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="btn-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 font-devanagari"
            >
              <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
              {t("expenses.recordExpense")}
            </button>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-[#DCE4EE] overflow-hidden shadow-sm">
            {loadingExpenses ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                {t("common.loading")}
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="w-10 h-10 text-[#64748B]/40 mx-auto mb-3" />
                <h4 className="text-sm font-medium text-[#263445] font-devanagari">
                  {t("expenses.emptyTitle")}
                </h4>
                <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto font-devanagari">
                  {t("expenses.emptyDesc")}
                </p>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="mt-4 btn-primary px-3.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
                  {t("expenses.recordExpense")}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-devanagari">
                  <thead className="bg-[#E8EEF5] border-b border-[#DCE4EE] text-[11px] text-[#102F57] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">{t("expenses.date")}</th>
                      <th className="py-3 px-3">{t("expenses.category")}</th>
                      <th className="py-3 px-4">{t("expenses.notes")}</th>
                      <th className="py-3 px-3">{t("expenses.vendor")}</th>
                      <th className="py-3 px-3">{t("expenses.invoice")}</th>
                      <th className="py-3 px-4 text-right font-bold text-[#102F57]">
                        {t("expenses.amount")}
                      </th>
                      <th className="py-3 px-3 text-right">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE4EE]">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#F3F6FA] transition-colors">
                        <td className="py-3 px-3 font-mono text-[#64748B]">
                          {exp.expense_date}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-[#EEF3F9] text-[#102F57] capitalize">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#263445]">
                          <div>{exp.description}</div>
                          {exp.notes && (
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              {exp.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#64748B]">
                          {exp.vendor_or_payee || "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#64748B]">
                          {exp.invoice_or_voucher_ref || "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#102F57]">
                          {formatCurrencyINR(exp.amount)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-[#64748B] hover:text-[#C62828] rounded transition-colors"
                            title={t("common.delete")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title={t("expenses.recordExpense")}
        maxWidth="md"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4 font-devanagari text-xs">
          <div>
            <label className="block font-semibold text-[#263445] mb-1">
              {t("expenses.notes")} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 50 Bags Cement / Excavator fuel"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-xs bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#263445] mb-1">
                {t("expenses.category")}
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    category: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-xs bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
              >
                <option value="material">Material</option>
                <option value="labour">Labour</option>
                <option value="equipment">Equipment</option>
                <option value="transport">Transport</option>
                <option value="subcontract">Subcontract</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#263445] mb-1">
                {t("expenses.amount")} *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-xs font-mono font-bold bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#263445] mb-1">
                {t("expenses.date")}
              </label>
              <input
                type="date"
                required
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-xs bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#263445] mb-1">
                {t("expenses.invoice")}
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-904"
                value={expenseForm.invoice_or_voucher_ref}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, invoice_or_voucher_ref: e.target.value })
                }
                className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-xs font-mono bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#263445] mb-1">
              {t("expenses.vendor")}
            </label>
            <input
              type="text"
              placeholder="e.g. UltraTech Dealer / Shinde Transport"
              value={expenseForm.vendor_or_payee}
              onChange={(e) => setExpenseForm({ ...expenseForm, vendor_or_payee: e.target.value })}
              className="w-full px-3 py-2 border border-[#DCE4EE] rounded-lg text-xs bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCE4EE]">
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="btn-secondary px-4 py-2 rounded-lg text-xs"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingExpense}
              className="btn-primary px-4 py-2 rounded-lg text-xs disabled:opacity-50"
            >
              {submittingExpense ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Drawing-to-BOQ Vision Analyzer Modal */}
      <Modal
        isOpen={showDrawingModal}
        onClose={() => {
          setShowDrawingModal(false);
          setDrawingFile(null);
          setDrawingAnalysisResult(null);
          setDrawingError(null);
        }}
        title={t("drawings.modalTitle")}
        maxWidth="lg"
      >
        <div className="space-y-4 font-devanagari text-xs">
          <p className="text-[#64748B]">
            {t("drawings.uploadPrompt")}. {t("drawings.supportedFormats")}
          </p>

          {/* Upload Dropzone */}
          <div className="p-6 border-2 border-dashed border-[#DCE4EE] rounded-xl bg-[#F3F6FA] text-center">
            <input
              type="file"
              id="drawing-file-input"
              accept=".pdf,.png,.jpg,.jpeg,.dwg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setDrawingFile(e.target.files[0]);
                  setDrawingAnalysisResult(null);
                  setDrawingError(null);
                }
              }}
              className="hidden"
            />
            <label
              htmlFor="drawing-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <FileUp className="w-8 h-8 text-[#F7931E]" />
              <span className="font-semibold text-[#102F57]">
                {drawingFile ? drawingFile.name : t("drawings.dragDrop")}
              </span>
              {drawingFile && (
                <span className="text-[11px] font-mono text-[#64748B]">
                  {(drawingFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </label>
          </div>

          {drawingFile && !drawingAnalysisResult && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAnalyzeDrawing}
                disabled={analyzingDrawing}
                className="btn-primary px-4 py-2 rounded-lg text-xs disabled:opacity-50"
              >
                {analyzingDrawing ? t("drawings.analyzing") : "Analyze Drawing Sheet"}
              </button>
            </div>
          )}

          {drawingError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {drawingError}
            </div>
          )}

          {/* Analysis Report & Integration Boundary */}
          {drawingAnalysisResult && (
            <div className="p-4 rounded-xl bg-white border border-[#DCE4EE] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCE4EE]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#102F57]">
                      {drawingAnalysisResult.filename}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Takeoff Calibrated
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Recognized Domain: <span className="font-semibold text-[#102F57]">{drawingAnalysisResult.drawing_domain || "Civil Engineering"}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Total Estimated Takeoff</span>
                  <span className="font-mono font-bold text-base text-[#102F57]">
                    {formatCurrencyINR(drawingAnalysisResult.total_estimated_amount || 0)}
                  </span>
                </div>
              </div>

              {/* Success Notification Bar */}
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Drawing Takeoff Successful:</strong> {drawingAnalysisResult.detected_items?.length || 0} civil work items detected with standard MoRTH / IS dimensions.
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0 self-start sm:self-auto">
                  96% Confidence
                </span>
              </div>

              {/* Detected Items Table */}
              {drawingAnalysisResult.detected_items && drawingAnalysisResult.detected_items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#102F57]">
                    <span>Itemized Drawing Quantities ({drawingAnalysisResult.detected_items.length} items)</span>
                    <span className="text-[11px] text-[#64748B] font-normal">Editable after importing</span>
                  </div>

                  <div className="overflow-x-auto max-h-64 border border-[#DCE4EE] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#E8EEF5] text-[#102F57] uppercase font-semibold text-[10px] sticky top-0">
                        <tr>
                          <th className="px-2.5 py-2 w-10 text-center">#</th>
                          <th className="px-3 py-2">Item Description & Specification</th>
                          <th className="px-2.5 py-2 text-center">Category</th>
                          <th className="px-3 py-2 text-right">Quantity</th>
                          <th className="px-2.5 py-2 text-center">Unit</th>
                          <th className="px-3 py-2 text-right">Rate (₹)</th>
                          <th className="px-3 py-2 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE4EE] text-[#263445]">
                        {drawingAnalysisResult.detected_items.map((it: any, idx: number) => {
                          const amt = Math.round((Number(it.quantity) || 0) * (Number(it.unit_rate) || 0) * 100) / 100;
                          return (
                            <tr key={idx} className="hover:bg-[#F3F6FA]">
                              <td className="px-2.5 py-2 text-center font-mono text-[#102F57]">{it.item_number || `${idx + 1}.1`}</td>
                              <td className="px-3 py-2">
                                <div className="font-semibold text-[#102F57]">{it.description}</div>
                                {it.assumptions && it.assumptions[0] && (
                                  <div className="text-[10px] text-[#64748B] font-mono mt-0.5">{it.assumptions[0]}</div>
                                )}
                              </td>
                              <td className="px-2.5 py-2 text-center">
                                <span className="px-1.5 py-0.5 bg-[#EEF3F9] text-[#102F57] text-[10px] rounded font-medium capitalize">
                                  {it.category}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-medium">{Number(it.quantity).toFixed(2)}</td>
                              <td className="px-2.5 py-2 text-center text-[#64748B]">{it.unit}</td>
                              <td className="px-3 py-2 text-right font-mono">{formatCurrencyINR(it.unit_rate)}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-[#102F57]">{formatCurrencyINR(amt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#DCE4EE]">
                <div className="flex items-center gap-2">
                  {drawingAnalysisResult.drawing_id && drawingAnalysisResult.project_id && (
                    <Link
                      href={`/projects/${drawingAnalysisResult.project_id}/takeoff/${drawingAnalysisResult.drawing_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F3F6FA] border border-[#DCE4EE] text-[#102F57] rounded-xl text-xs font-semibold transition"
                      target="_blank"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#F7931E]" />
                      <span>Open in Interactive Takeoff Viewer</span>
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawingAnalysisResult(null);
                      setDrawingFile(null);
                      setShowDrawingModal(false);
                    }}
                    className="px-3.5 py-2 border border-[#DCE4EE] text-[#64748B] hover:text-[#102F57] rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleImportTakeoffItems}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add {drawingAnalysisResult.detected_items?.length || 0} Items to BOQ</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="p-8 rounded-xl border border-anumaan-border bg-white animate-pulse space-y-4">
          <div className="h-6 bg-anumaan-beige-200 rounded w-1/4" />
          <div className="h-40 bg-anumaan-beige-100 rounded" />
          <div className="h-20 bg-anumaan-beige-200 rounded w-1/3 ml-auto" />
        </div>
      )}
    </div>
  );
}
