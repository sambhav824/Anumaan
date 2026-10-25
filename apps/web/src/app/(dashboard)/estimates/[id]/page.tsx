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
} from "lucide-react";
import { useTranslation } from "../../../../context/I18nContext";
import { useOrg } from "../../../../context/OrgContext";
import { api, Estimate, BOQItem } from "../../../../lib/api";
import { BOQTable } from "../../../../components/BOQTable";
import { formatIndianCurrency } from "../../../../lib/calculations";

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params?.id as string;

  const { t } = useTranslation();
  const { currentOrg } = useOrg();

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

  useEffect(() => {
    loadEstimate();
  }, [loadEstimate]);

  const handleSave = async () => {
    if (!currentOrg?.id || !estimateId || !estimate) return;
    try {
      setSaving(true);
      setSaveSuccess(false);

      // 1. Update estimate rates and metadata
      await api.updateEstimate(currentOrg.id, estimateId, {
        overhead_pct: overheadPct,
        contingency_pct: contingencyPct,
        discount_pct: discountPct,
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

  const isLocked = estimate?.status === "approved";

  return (
    <div className="space-y-6">
      {/* Back button & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/estimates"
            className="p-1.5 rounded-lg border border-anumaan-border bg-white text-anumaan-charcoal-600 hover:bg-anumaan-beige-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-anumaan-charcoal-900 font-devanagari">
                {estimate?.name || t("estimates.name")}
              </h1>
              {estimate?.estimate_number && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-anumaan-gold-50 border border-anumaan-gold-500/40 text-anumaan-gold-700">
                  {estimate.estimate_number}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-anumaan-charcoal-500 mt-0.5">
              <span>{estimate?.project_name}</span>
              <span>•</span>
              <span className="capitalize">
                {estimate?.category ? `${t(`projectType.${estimate.category}`)} ${t("common.construction")}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {estimate?.status === "draft" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("submitted")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-anumaan-border bg-white text-anumaan-charcoal-700 hover:bg-anumaan-beige-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t("estimates.reopen")}
              </button>
              <button
                type="button"
                onClick={() => handleStatusTransition("approved")}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-anumaan-border bg-white text-anumaan-charcoal-700 hover:bg-anumaan-beige-50"
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-anumaan-gold-600 text-white font-semibold text-xs hover:bg-anumaan-gold-700 transition-colors shadow-xs disabled:opacity-50"
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

      {/* Main BOQ Table Editor */}
      {!loading && !error && estimate && (
        <BOQTable
          items={items}
          onItemsChange={setItems}
          overheadPct={overheadPct}
          contingencyPct={contingencyPct}
          discountPct={discountPct}
          gstPct={gstPct}
          onPercentagesChange={(rates) => {
            setOverheadPct(rates.overheadPct);
            setContingencyPct(rates.contingencyPct);
            setDiscountPct(rates.discountPct);
            setGstPct(rates.gstPct);
          }}
          readOnly={isLocked}
        />
      )}

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
