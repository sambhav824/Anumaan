"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Percent, Sparkles, Shield, Building2, Tag, Landmark } from "lucide-react";
import { useTranslation } from "../context/I18nContext";

export interface ContractorRatesValues {
  overheadPct: number;
  contingencyPct: number;
  discountPct?: number;
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
          <h4 className="text-xs font-bold text-[#102F57] tracking-wide flex items-center gap-1.5 font-heading">
            <Sparkles className="w-3.5 h-3.5 text-[#F7931E]" />
            <span>{t("estimates.configurable_rates_heading")}</span>
          </h4>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            {t("estimates.contractor_formula_title")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#102F57] bg-[#EEF3F9] hover:bg-[#E8EEF5] border border-[#DCE4EE] rounded-lg transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0 text-[#102F57]" />
          <span>{showGuide ? t("estimates.contractor_guide_close") : t("estimates.contractor_guide_toggle")}</span>
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Visual Step-by-Step Calculation Formula Banner */}
      <div className="bg-[#F3F6FA] border border-[#DCE4EE] rounded-xl p-2.5 text-xs text-[#263445] overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max text-[11px]">
          <span className="px-2 py-0.5 bg-white border border-[#DCE4EE] rounded-md font-semibold text-[#102F57] shadow-2xs">
            {t("estimates.formula_base_work")}
          </span>
          <span className="text-[#64748B] font-bold">➔</span>
          <span className="px-2 py-0.5 bg-white border border-[#DCE4EE] rounded-md font-semibold text-[#102F57] shadow-2xs">
            {t("estimates.formula_overhead")}
          </span>
          <span className="text-[#64748B] font-bold">➔</span>
          <span className="px-2 py-0.5 bg-white border border-[#DCE4EE] rounded-md font-semibold text-[#102F57] shadow-2xs">
            {t("estimates.formula_contingency")}
          </span>
          <span className="text-[#64748B] font-bold">➔</span>
          <span className="px-2 py-0.5 bg-white border border-[#DCE4EE] rounded-md font-semibold text-[#102F57] shadow-2xs">
            {t("estimates.formula_gst")}
          </span>
          <span className="text-[#64748B] font-bold">=</span>
          <span className="px-2 py-0.5 bg-[#102F57] border border-[#102F57] rounded-md font-bold text-white shadow-2xs">
            {t("estimates.formula_final_bill")}
          </span>
        </div>
      </div>

      {/* Expandable Contractor Explanatory Guide Card */}
      {showGuide && (
        <div className="p-3.5 bg-[#F3F6FA] border border-[#DCE4EE] rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="font-semibold text-xs text-[#102F57] flex items-center gap-1.5 font-heading">
            <HelpCircle className="w-4 h-4 text-[#F7931E]" />
            <span>{t("estimates.contractor_guide_title")}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-[#263445]">
            {/* Overhead Explanation */}
            <div className="p-2.5 bg-white border border-[#DCE4EE] rounded-lg">
              <div className="font-bold text-[#102F57] mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#F7931E]" />
                <span>{t("estimates.overhead")}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#64748B]">
                {t("estimates.guide_overhead_desc")}
              </p>
            </div>

            {/* Contingency Explanation */}
            <div className="p-2.5 bg-white border border-[#DCE4EE] rounded-lg">
              <div className="font-bold text-[#102F57] mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#102F57]" />
                <span>{t("estimates.contingency")}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#64748B]">
                {t("estimates.guide_contingency_desc")}
              </p>
            </div>

            {/* GST Explanation */}
            <div className="p-2.5 bg-white border border-[#DCE4EE] rounded-lg">
              <div className="font-bold text-[#102F57] mb-1 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-[#102F57]" />
                <span>{t("estimates.gst")}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#64748B]">
                {t("estimates.guide_gst_desc")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3 Interactive Rate Cards */}
      <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-3"} gap-2.5`}>
        {/* Overhead % Card */}
        <div className="p-2.5 rounded-xl border border-[#DCE4EE] bg-white shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-1">
            <label className="text-xs font-semibold text-[#102F57] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#F7931E] shrink-0" />
              <span>{t("estimates.overhead")}</span>
            </label>
          </div>
          <p className="text-[10px] text-[#64748B] leading-snug line-clamp-2">
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
              className="w-full text-xs font-bold font-mono pl-3 pr-7 py-1.5 border border-[#DCE4EE] rounded-lg bg-[#F3F6FA] text-[#263445] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57] disabled:bg-gray-100"
            />
            <Percent className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => updateField("overheadPct", 0)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.overheadPct === 0
                    ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                    : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                }`}
              >
                {t("estimates.preset_none")}
              </button>
              <button
                type="button"
                onClick={() => updateField("overheadPct", 5)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.overheadPct === 5
                    ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                    : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                }`}
              >
                {t("estimates.preset_medium")}
              </button>
              <button
                type="button"
                onClick={() => updateField("overheadPct", 10)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.overheadPct === 10
                    ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                    : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                }`}
              >
                {t("estimates.preset_high")}
              </button>
            </div>
          )}
        </div>

        {/* Contingency % Card */}
        <div className="p-2.5 rounded-xl border border-[#DCE4EE] bg-white shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-1">
            <label className="text-xs font-semibold text-[#102F57] flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-[#102F57] shrink-0" />
              <span>{t("estimates.contingency")}</span>
            </label>
          </div>
          <p className="text-[10px] text-[#64748B] leading-snug line-clamp-2">
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
              className="w-full text-xs font-bold font-mono pl-3 pr-7 py-1.5 border border-[#DCE4EE] rounded-lg bg-[#F3F6FA] text-[#263445] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57] disabled:bg-gray-100"
            />
            <Percent className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => updateField("contingencyPct", 0)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.contingencyPct === 0
                    ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                    : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                }`}
              >
                {t("estimates.preset_none")}
              </button>
              <button
                type="button"
                onClick={() => updateField("contingencyPct", 3)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.contingencyPct === 3
                    ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                    : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                }`}
              >
                {t("estimates.preset_safe")}
              </button>
              <button
                type="button"
                onClick={() => updateField("contingencyPct", 5)}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                  values.contingencyPct === 5
                    ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                    : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                }`}
              >
                {t("estimates.preset_medium")}
              </button>
            </div>
          )}
        </div>

        {/* GST % Card */}
        <div className="p-2.5 rounded-xl border border-[#DCE4EE] bg-white shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-1">
            <label className="text-xs font-semibold text-[#102F57] flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-[#102F57] shrink-0" />
              <span>{t("estimates.gst")}</span>
            </label>
          </div>
          <p className="text-[10px] text-[#64748B] leading-snug line-clamp-2">
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
              className="w-full text-xs font-bold font-mono pl-3 pr-7 py-1.5 border border-[#DCE4EE] rounded-lg bg-[#F3F6FA] text-[#263445] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#102F57] disabled:bg-gray-100"
            />
            <Percent className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!readOnly && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => updateField("gstPct", 0)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    values.gstPct === 0
                      ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                      : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                  }`}
                >
                  {t("estimates.preset_gst_exempt")}
                </button>
                <button
                  type="button"
                  onClick={() => updateField("gstPct", 5)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    values.gstPct === 5
                      ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                      : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                  }`}
                >
                  {t("estimates.preset_gst_5")}
                </button>
                <button
                  type="button"
                  onClick={() => updateField("gstPct", 12)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    values.gstPct === 12
                      ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                      : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                  }`}
                >
                  {t("estimates.preset_gst_govt")}
                </button>
                <button
                  type="button"
                  onClick={() => updateField("gstPct", 18)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    values.gstPct === 18
                      ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                      : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                  }`}
                >
                  {t("estimates.preset_gst_standard")}
                </button>
                <button
                  type="button"
                  onClick={() => updateField("gstPct", 28)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    values.gstPct === 28
                      ? "bg-[#102F57] text-white border-[#102F57] font-bold"
                      : "bg-[#F3F6FA] hover:bg-[#E8EEF5] text-[#263445] border-[#DCE4EE]"
                  }`}
                >
                  {t("estimates.preset_gst_28")}
                </button>
              </div>
              <p className="text-[9px] text-[#64748B] italic">
                {t("estimates.gst_disclaimer")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
