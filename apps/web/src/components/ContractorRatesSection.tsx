"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Percent, Sparkles, Shield, Building2, Tag, Landmark } from "lucide-react";
import { useTranslation } from "../context/I18nContext";

export interface ContractorRatesValues {
  overheadPct: number;
  contingencyPct: number;
  discountPct: number;
  gstPct: number;
}

interface ContractorRatesSectionProps {
  values: ContractorRatesValues;
  onChange: (newValues: ContractorRatesValues) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function ContractorRatesSection({
  values,
  onChange,
  readOnly = false,
  compact = false,
}: ContractorRatesSectionProps) {
  const { t } = useTranslation();
  const [showGuide, setShowGuide] = useState(false);

  const updateField = (field: keyof ContractorRatesValues, val: number) => {
    onChange({
      ...values,
      [field]: Math.max(0, isNaN(val) ? 0 : val),
    });
  };

  return (
    <div className="space-y-3 font-devanagari">
      {/* Header with Title and Guide Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-anumaan-charcoal-900 tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-anumaan-gold-600" />
            <span>{t("estimates.configurable_rates_heading")}</span>
          </h4>
          <p className="text-[11px] text-anumaan-charcoal-500 mt-0.5">
            {t("estimates.contractor_formula_title")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-anumaan-gold-700 bg-anumaan-gold-50/70 hover:bg-anumaan-gold-100/70 border border-anumaan-gold-200 rounded-lg transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{showGuide ? t("estimates.contractor_guide_close") : t("estimates.contractor_guide_toggle")}</span>
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Visual Step-by-Step Calculation Formula Banner */}
      <div className="bg-gradient-to-r from-stone-50 via-amber-50/30 to-stone-50 border border-anumaan-border-light rounded-xl p-2.5 text-xs text-anumaan-charcoal-700 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max text-[11px]">
          <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md font-medium text-stone-800 shadow-2xs">
            {t("estimates.formula_base_work")}
          </span>
          <span className="text-stone-400 font-bold">➔</span>
          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md font-medium text-amber-900 shadow-2xs">
            {t("estimates.formula_overhead")}
          </span>
          <span className="text-stone-400 font-bold">➔</span>
          <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md font-medium text-blue-900 shadow-2xs">
            {t("estimates.formula_contingency")}
          </span>
          <span className="text-stone-400 font-bold">➔</span>
          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md font-medium text-emerald-900 shadow-2xs">
            {t("estimates.formula_discount")}
          </span>
          <span className="text-stone-400 font-bold">➔</span>
          <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-md font-medium text-purple-900 shadow-2xs">
            {t("estimates.formula_gst")}
          </span>
          <span className="text-stone-400 font-bold">=</span>
          <span className="px-2 py-0.5 bg-anumaan-gold-100 border border-anumaan-gold-300 rounded-md font-bold text-anumaan-gold-900 shadow-2xs">
            {t("estimates.formula_final_bill")}
          </span>
        </div>
      </div>

      {/* Expandable Contractor Explanatory Guide Card */}
      {showGuide && (
        <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="font-semibold text-xs text-amber-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>{t("estimates.contractor_guide_title")}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-anumaan-charcoal-700">
            {/* Overhead Explanation */}
            <div className="p-2.5 bg-white/90 border border-amber-200/60 rounded-lg">
              <div className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{t("estimates.overhead")}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-anumaan-charcoal-600">
                {t("estimates.guide_overhead_desc")}
              </p>
            </div>

            {/* Contingency Explanation */}
            <div className="p-2.5 bg-white/90 border border-blue-200/60 rounded-lg">
              <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>{t("estimates.contingency")}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-anumaan-charcoal-600">
                {t("estimates.guide_contingency_desc")}
              </p>
            </div>

            {/* Discount Explanation */}
            <div className="p-2.5 bg-white/90 border border-emerald-200/60 rounded-lg">
              <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t("estimates.discount")}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-anumaan-charcoal-600">
                {t("estimates.guide_discount_desc")}
              </p>
            </div>

            {/* GST Explanation */}
            <div className="p-2.5 bg-white/90 border border-purple-200/60 rounded-lg">
              <div className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-purple-600" />
                <span>{t("estimates.gst")}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-anumaan-charcoal-600">
                {t("estimates.guide_gst_desc")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Interactive Rate Cards */}
      <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"} gap-2.5`}>
        {/* Overhead % Card */}
        <div className="p-2.5 rounded-xl border border-amber-200/80 bg-white shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-1">
            <label className="text-xs font-semibold text-anumaan-charcoal-800 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{t("estimates.overhead")}</span>
            </label>
          </div>
          <p className="text-[10px] text-anumaan-charcoal-500 leading-snug line-clamp-2">
            {t("estimates.overhead_help")}
          </p>

          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              disabled={readOnly}
              value={values.overheadPct}
              onChange={(e) => updateField("overheadPct", parseFloat(e.target.value))}
              className="w-full text-xs font-bold font-mono pl-3 pr-7 py-1.5 border border-anumaan-border rounded-lg bg-anumaan-beige-50/30 text-anumaan-charcoal-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
            />
            <Percent className="w-3.5 h-3.5 text-anumaan-charcoal-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => updateField("overheadPct", 0)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.overheadPct === 0
                    ? "bg-amber-600 text-white border-amber-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_none")}
              </button>
              <button
                type="button"
                onClick={() => updateField("overheadPct", 5)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.overheadPct === 5
                    ? "bg-amber-600 text-white border-amber-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_medium")}
              </button>
              <button
                type="button"
                onClick={() => updateField("overheadPct", 10)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.overheadPct === 10
                    ? "bg-amber-600 text-white border-amber-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_high")}
              </button>
            </div>
          )}
        </div>

        {/* Contingency % Card */}
        <div className="p-2.5 rounded-xl border border-blue-200/80 bg-white shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-1">
            <label className="text-xs font-semibold text-anumaan-charcoal-800 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{t("estimates.contingency")}</span>
            </label>
          </div>
          <p className="text-[10px] text-anumaan-charcoal-500 leading-snug line-clamp-2">
            {t("estimates.contingency_help")}
          </p>

          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              disabled={readOnly}
              value={values.contingencyPct}
              onChange={(e) => updateField("contingencyPct", parseFloat(e.target.value))}
              className="w-full text-xs font-bold font-mono pl-3 pr-7 py-1.5 border border-anumaan-border rounded-lg bg-anumaan-beige-50/30 text-anumaan-charcoal-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <Percent className="w-3.5 h-3.5 text-anumaan-charcoal-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => updateField("contingencyPct", 0)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.contingencyPct === 0
                    ? "bg-blue-600 text-white border-blue-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_none")}
              </button>
              <button
                type="button"
                onClick={() => updateField("contingencyPct", 3)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.contingencyPct === 3
                    ? "bg-blue-600 text-white border-blue-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_safe")}
              </button>
              <button
                type="button"
                onClick={() => updateField("contingencyPct", 5)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.contingencyPct === 5
                    ? "bg-blue-600 text-white border-blue-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_medium")}
              </button>
            </div>
          )}
        </div>

        {/* Discount % Card */}
        <div className="p-2.5 rounded-xl border border-emerald-200/80 bg-white shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-1">
            <label className="text-xs font-semibold text-anumaan-charcoal-800 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{t("estimates.discount")}</span>
            </label>
          </div>
          <p className="text-[10px] text-anumaan-charcoal-500 leading-snug line-clamp-2">
            {t("estimates.discount_help")}
          </p>

          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              disabled={readOnly}
              value={values.discountPct}
              onChange={(e) => updateField("discountPct", parseFloat(e.target.value))}
              className="w-full text-xs font-bold font-mono pl-3 pr-7 py-1.5 border border-anumaan-border rounded-lg bg-anumaan-beige-50/30 text-anumaan-charcoal-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100"
            />
            <Percent className="w-3.5 h-3.5 text-anumaan-charcoal-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => updateField("discountPct", 0)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.discountPct === 0
                    ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_discount_none")}
              </button>
              <button
                type="button"
                onClick={() => updateField("discountPct", 2)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.discountPct === 2
                    ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_discount_small")}
              </button>
              <button
                type="button"
                onClick={() => updateField("discountPct", 5)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.discountPct === 5
                    ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_discount_good")}
              </button>
            </div>
          )}
        </div>

        {/* GST % Card */}
        <div className="p-2.5 rounded-xl border border-purple-200/80 bg-white shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-1">
            <label className="text-xs font-semibold text-anumaan-charcoal-800 flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{t("estimates.gst")}</span>
            </label>
          </div>
          <p className="text-[10px] text-anumaan-charcoal-500 leading-snug line-clamp-2">
            {t("estimates.gst_help")}
          </p>

          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              disabled={readOnly}
              value={values.gstPct}
              onChange={(e) => updateField("gstPct", parseFloat(e.target.value))}
              className="w-full text-xs font-bold font-mono pl-3 pr-7 py-1.5 border border-anumaan-border rounded-lg bg-anumaan-beige-50/30 text-anumaan-charcoal-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
            />
            <Percent className="w-3.5 h-3.5 text-anumaan-charcoal-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 pt-0.5 flex-wrap">
              <button
                type="button"
                onClick={() => updateField("gstPct", 0)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.gstPct === 0
                    ? "bg-purple-600 text-white border-purple-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_gst_exempt")}
              </button>
              <button
                type="button"
                onClick={() => updateField("gstPct", 12)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.gstPct === 12
                    ? "bg-purple-600 text-white border-purple-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_gst_govt")}
              </button>
              <button
                type="button"
                onClick={() => updateField("gstPct", 18)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.gstPct === 18
                    ? "bg-purple-600 text-white border-purple-600 font-bold"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                {t("estimates.preset_gst_standard")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
