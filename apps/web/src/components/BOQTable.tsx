"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BOQItem } from "../lib/api";

import { useTranslation } from "../context/I18nContext";
import {
  calculateEstimateTotals,
  formatIndianCurrency,
} from "../lib/calculations";
import { MeasurementCalculatorModal, FormulaType } from "./MeasurementCalculatorModal";
import { ContractorRatesSection } from "./ContractorRatesSection";
import { Modal } from "./Modal";
import { useSafeOrg } from "../context/OrgContext";
import { api, RateItem } from "../lib/api";
import {
  Calculator,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  HelpCircle,
  BookOpen,
  Search,
  RefreshCw,
  Ruler,
  AlertCircle,
  BookmarkPlus,
} from "lucide-react";


interface BOQTableProps {
  items: BOQItem[];
  onItemsChange: (items: BOQItem[]) => void;
  organizationId?: string;
  overheadPct?: number;
  contingencyPct?: number;
  discountPct?: number; // Kept as optional for backward compat, not shown in active UI
  gstPct?: number;
  onPercentagesChange?: (rates: {
    overheadPct: number;
    contingencyPct: number;
    discountPct?: number;
    gstPct: number;
  }) => void;
  readOnly?: boolean;
}

export function BOQTable({
  items,
  onItemsChange,
  organizationId,
  overheadPct = 0,
  contingencyPct = 0,
  discountPct = 0,
  gstPct = 0,
  onPercentagesChange,
  readOnly = false,
}: BOQTableProps) {
  const { t, locale } = useTranslation();
  const orgCtx = useSafeOrg();
  const activeOrgId = organizationId || orgCtx?.currentOrg?.id;

  // Active editing or adding index
  const [calculatorItemIndex, setCalculatorItemIndex] = useState<number | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  // Rate Library Picker State
  const [showRatePicker, setShowRatePicker] = useState(false);
  const [rateItems, setRateItems] = useState<RateItem[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [rateSearch, setRateSearch] = useState("");
  const [selectedRateItem, setSelectedRateItem] = useState<RateItem | null>(null);
  const [pickerQuantity, setPickerQuantity] = useState<number>(1);

  // Rate Refresh State
  const [refreshTarget, setRefreshTarget] = useState<{
    index: number;
    itemDescription: string;
    currentRate: number;
    latestRate: number;
    quantity: number;
    unit: string;
  } | null>(null);
  const [checkingRateIndex, setCheckingRateIndex] = useState<number | null>(null);

  // New item draft state
  const [showAddRow, setShowAddRow] = useState(false);
  const [draftItem, setDraftItem] = useState<BOQItem>({
    item_number: `${items.length + 1}.1`,
    description: "",
    category: "concrete",
    quantity: 1,
    unit: "cum",
    unit_rate: 0,
    is_manual: true,
  });

  const handleOpenRatePicker = async () => {
    setShowRatePicker(true);
    setSelectedRateItem(null);
    setPickerQuantity(1);
    if (!activeOrgId) return;
    try {
      setLoadingRates(true);
      const res = await api.listRateItems(activeOrgId);
      setRateItems(res);
    } catch (err) {
      console.error("Failed to load rates for BOQ picker:", err);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleSelectRateItemForConfig = (rateItem: RateItem) => {
    setSelectedRateItem(rateItem);
    setPickerQuantity(1);
  };

  const handleConfirmAddFromLibrary = () => {
    if (!selectedRateItem) return;
    const rate = Number(selectedRateItem.combined_rate) || Number(selectedRateItem.material_rate) || 0;
    const qty = Math.max(0.0001, pickerQuantity);
    const amount = Math.round(qty * rate * 100) / 100;

    // Smart category classification
    let mappedCat = "general";
    const code = selectedRateItem.code || "";
    if (code.startsWith("ROA-")) mappedCat = "road";
    else if (code.startsWith("CON-") || code.startsWith("CEM-")) mappedCat = "concrete";
    else if (code.startsWith("MAS-") || code.startsWith("BRK-") || code.startsWith("BLK-")) mappedCat = "masonry";
    else if (code.startsWith("PLS-")) mappedCat = "plaster";
    else if (code.startsWith("EAR-")) mappedCat = "earthwork";
    else if (code.startsWith("FIN-") || code.startsWith("PNT-") || code.startsWith("WPR-")) mappedCat = "finishing";
    else if (selectedRateItem.category === "material") mappedCat = "concrete";

    const specPart = selectedRateItem.specification ? `[${selectedRateItem.specification}] ` : "";
    const sourcePart = selectedRateItem.supplier_or_source_name ? `(Source: ${selectedRateItem.supplier_or_source_name})` : "";
    const isCompleted = selectedRateItem.rate_type === "completed_work" || selectedRateItem.category === "composite";
    const typeNotice = isCompleted ? " [Completed-Work Rate: Materials + Labour included]" : "";
    const composedNotes = `${specPart}${selectedRateItem.description || selectedRateItem.notes || ""}${typeNotice} ${sourcePart}`.trim();

    const newItem: BOQItem = {
      item_number: `${items.length + 1}.1`,
      description: selectedRateItem.name,
      category: mappedCat,
      quantity: qty,
      unit: selectedRateItem.unit,
      unit_rate: rate,
      amount,
      rate_item_id: selectedRateItem.id,
      is_manual: true,
      notes: composedNotes || undefined,
    };

    onItemsChange([...items, newItem]);
    setSelectedRateItem(null);
    setShowRatePicker(false);
  };

  // Check and refresh rate for a row from the library
  const handleCheckAndRefreshRate = async (idx: number) => {
    const item = items[idx];
    if (!activeOrgId || !item.rate_item_id) return;

    try {
      setCheckingRateIndex(idx);
      const rateItem = await api.getRateItem(activeOrgId, item.rate_item_id);
      const latestRate = Number(
        rateItem.combined_rate || (rateItem.material_rate + rateItem.labour_rate + (rateItem.equipment_rate || 0))
      );
      const currentRate = Number(item.unit_rate);

      if (Math.abs(latestRate - currentRate) < 0.001) {
        alert(`Rate for "${item.description}" is already up to date at ₹${currentRate.toFixed(2)} / ${item.unit}.`);
        return;
      }

      setRefreshTarget({
        index: idx,
        itemDescription: item.description,
        currentRate,
        latestRate,
        quantity: item.quantity,
        unit: item.unit,
      });
    } catch (err) {
      console.error("Failed to check latest rate:", err);
      alert("Could not load latest rate from Rate Library.");
    } finally {
      setCheckingRateIndex(null);
    }
  };

  const confirmRefreshRate = () => {
    if (!refreshTarget) return;
    const updated = [...items];
    const it = updated[refreshTarget.index];
    it.unit_rate = refreshTarget.latestRate;
    it.amount = Math.round(it.quantity * refreshTarget.latestRate * 100) / 100;
    onItemsChange(updated);
    setRefreshTarget(null);
  };

  // Calculate live financial summary (strict no-discount)
  const totals = calculateEstimateTotals(
    items.map((it) => ({ quantity: it.quantity, unit_rate: it.unit_rate })),
    overheadPct,
    contingencyPct,
    0, // Strict zero discount in active UI
    gstPct
  );

  const handleAddItem = () => {
    if (!draftItem.description.trim()) return;
    const amount = Math.round(draftItem.quantity * draftItem.unit_rate * 100) / 100;
    const updated = [...items, { ...draftItem, amount }];
    onItemsChange(updated);
    setShowAddRow(false);
    setDraftItem({
      item_number: `${updated.length + 1}.1`,
      description: "",
      category: "concrete",
      quantity: 1,
      unit: "cum",
      unit_rate: 0,
      is_manual: true,
    });
  };

  const handleInlineRateChange = (index: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...items];
    const it = updated[index];
    const newRate = isNaN(num) || num < 0 ? 0 : num;
    it.unit_rate = newRate;
    it.amount = Math.round(it.quantity * newRate * 100) / 100;
    onItemsChange(updated);
  };

  const handleInlineQuantityChange = (index: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...items];
    const it = updated[index];
    const newQty = isNaN(num) || num < 0 ? 0 : num;
    it.quantity = newQty;
    it.amount = Math.round(newQty * it.unit_rate * 100) / 100;
    onItemsChange(updated);
  };

  const handlePushRateToLibrary = async (item: BOQItem) => {
    if (!organizationId) return;
    const confirmMsg = `Update or save ₹${item.unit_rate} per ${item.unit} for "${item.description}" into your organization's reusable Rate Library?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (item.rate_item_id) {
        await api.updateRateItem(organizationId, item.rate_item_id, {
          material_rate: item.unit_rate,
          combined_rate: item.unit_rate,
          is_custom: true,
          notes: "Updated from BOQ estimate",
        });
      } else {
        await api.createRateItem(organizationId, {
          name: item.description,
          category: item.category as any || "material",
          rate_type: "raw_material",
          unit: item.unit,
          material_rate: item.unit_rate,
          labour_rate: 0,
          combined_rate: item.unit_rate,
          rate_source: "Manual",
          is_custom: true,
          notes: "Saved from BOQ estimate",
        });
      }
      alert("Rate saved to company Rate Library successfully.");
    } catch (err: any) {
      alert(err?.message || "Failed to save rate to library.");
    }
  };

  const handleDuplicateItem = (index: number) => {
    const it = items[index];
    const nextItemNumber = `${items.length + 1}.${index + 1}`;
    const duplicated: BOQItem = {
      ...it,
      id: undefined,
      item_number: nextItemNumber,
      description: `${it.description} (Copy)`,
    };
    onItemsChange([...items, duplicated]);
  };

  const handleDeleteItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleOpenCalculatorForItem = (index: number | null) => {
    setCalculatorItemIndex(index);
    setShowCalculator(true);
  };

  const handleApplyCalculator = (
    qty: number,
    unit: string,
    calcType: FormulaType,
    calcDetails: any
  ) => {
    if (calculatorItemIndex !== null && calculatorItemIndex >= 0) {
      // Apply to existing item
      const updated = [...items];
      const target = updated[calculatorItemIndex];
      target.quantity = qty;
      target.unit = unit;
      target.is_manual = false;
      target.calculation_type = calcType;
      target.calculation_details = calcDetails;
      target.amount = Math.round(qty * target.unit_rate * 100) / 100;
      onItemsChange(updated);
    } else {
      // Apply to draft item
      setDraftItem({
        ...draftItem,
        quantity: qty,
        unit: unit,
        is_manual: false,
        calculation_type: calcType,
        calculation_details: calcDetails,
      });
      setShowAddRow(true);
    }
    setShowCalculator(false);
  };

  return (
    <div className="space-y-6">
      {/* Table Container */}
      <div className="border border-[#DCE4EE] rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#E8EEF5] border-b border-[#DCE4EE] text-[#102F57] uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 w-16 text-center">{t("estimates.item_number")}</th>
                <th className="py-3 px-4 min-w-[220px]">{t("estimates.description")}</th>
                <th className="py-3 px-3 w-28">{t("estimates.category")}</th>
                <th className="py-3 px-3 w-24 text-right">{t("estimates.quantity")}</th>
                <th className="py-3 px-3 w-20 text-center">{t("estimates.unit")}</th>
                <th className="py-3 px-3 w-28 text-right">{t("estimates.unit_rate")}</th>
                <th className="py-3 px-3 w-32 text-right">{t("estimates.amount")}</th>
                <th className="py-3 px-3 w-28 text-center">{t("estimates.calculation")}</th>
                {!readOnly && <th className="py-3 px-3 w-24 text-center">{t("common.actions")}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE4EE] text-[#263445]">
              {items.length === 0 && !showAddRow && (
                <tr>
                  <td colSpan={readOnly ? 8 : 9} className="py-8 text-center text-[#64748B] font-devanagari">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#102F57]" />
                    {t("estimates.empty_boq_notice")}
                  </td>
                </tr>
              )}

              {items.map((item, idx) => {
                const qtyNum = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || 0).replace(/[^0-9.-]/g, '')) || 0;
                const rateNum = typeof item.unit_rate === 'number' ? item.unit_rate : parseFloat(String(item.unit_rate || 0).replace(/[^0-9.-]/g, '')) || 0;
                const rawAmt = item.amount;
                const parsedAmt = typeof rawAmt === 'number' ? rawAmt : (rawAmt ? parseFloat(String(rawAmt).replace(/[^0-9.-]/g, '')) : NaN);
                const amount = (!isNaN(parsedAmt) && parsedAmt > 0) ? parsedAmt : Math.round(qtyNum * rateNum * 100) / 100;
                const displayRate = isNaN(rateNum) ? 0 : rateNum;
                const displayAmount = isNaN(amount) ? 0 : amount;
                return (
                  <tr key={item.id || idx} className="hover:bg-[#F3F6FA] transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-[#102F57]">
                      {item.item_number}
                    </td>

                    {/* Description with Measurement Formula and Rate Library Badges */}
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-[#102F57]">{item.description}</div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {/* Measurement Formula Badge */}
                        {item.calculation_details?.formula && (
                          <button
                            type="button"
                            onClick={() => handleOpenCalculatorForItem(idx)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFF6EB] text-[10px] text-[#B86B08] border border-[#F7931E]/30 hover:bg-[#FEEFD9] font-mono transition-colors"
                            title="Click to view or edit measurement dimensions"
                          >
                            <Ruler className="w-2.5 h-2.5 text-[#F7931E] shrink-0" />
                            <span className="truncate max-w-[220px]">{item.calculation_details.formula}</span>
                          </button>
                        )}

                        {/* Rate Library Source Tag & Explicit Refresh Action */}
                        {item.rate_item_id && (
                          <div className="inline-flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EEF3F9] text-[10px] font-medium text-[#102F57] border border-[#DCE4EE]">
                              <BookOpen className="w-2.5 h-2.5 text-[#102F57]" />
                              <span>Library Rate</span>
                            </span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleCheckAndRefreshRate(idx)}
                                disabled={checkingRateIndex === idx}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white hover:bg-[#F3F6FA] text-[10px] font-semibold text-[#102F57] border border-[#DCE4EE] transition-colors"
                                title="Check and refresh rate from Rate Library"
                              >
                                <RefreshCw className={`w-2.5 h-2.5 ${checkingRateIndex === idx ? "animate-spin" : ""}`} />
                                <span>Refresh</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-[#263445] font-devanagari">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-[#EEF3F9] text-[#102F57]">
                        {t(`boqCategories.${item.category}`) || item.category}
                      </span>
                    </td>

                    <td className="py-2 px-2 text-right font-mono">
                      {readOnly ? (
                        <span className="font-semibold text-xs">
                          {Number(item.quantity).toLocaleString("en-IN", { maximumFractionDigits: 4 })}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleInlineQuantityChange(idx, e.target.value)}
                          className="w-20 px-1.5 py-1 text-right font-mono font-semibold text-xs border border-[#DCE4EE] rounded focus:outline-none focus:ring-1 focus:ring-[#102F57] bg-white text-[#102F57] hover:border-[#102F57] transition-colors"
                          title="Click to edit quantity directly"
                        />
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center text-[#64748B] font-mono text-[11px]">
                      {t(`units.${item.unit}`) || item.unit}
                    </td>

                    <td className="py-2 px-2 text-right font-mono">
                      {readOnly ? (
                        <span className="text-xs">
                          ₹{displayRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[#64748B] text-[11px] font-semibold">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_rate}
                            onChange={(e) => handleInlineRateChange(idx, e.target.value)}
                            className="w-24 px-1.5 py-1 text-right font-mono font-semibold text-xs border border-[#DCE4EE] rounded focus:outline-none focus:ring-1 focus:ring-[#102F57] bg-white text-[#102F57] hover:border-[#102F57] transition-colors"
                            title="Edit unit rate in ₹ (Line Amount and Grand Total recalculate immediately)"
                          />
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#102F57]">
                      ₹{displayAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {item.is_manual ? (
                        <span className="inline-block px-2 py-0.5 text-[10px] rounded bg-gray-100 text-gray-600 font-medium font-devanagari">
                          {t("estimates.manual")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenCalculatorForItem(idx)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-[#FFF6EB] border border-[#F7931E]/40 text-[#B86B08] font-medium hover:bg-[#FEEFD9] transition-colors font-devanagari"
                          title={item.calculation_details?.formula || "Calculated using measurement formula"}
                        >
                          <Calculator className="w-2.5 h-2.5 text-[#F7931E]" />
                          <span>{item.calculation_type || t("estimates.calculated") || "Calculated"}</span>
                        </button>
                      )}
                    </td>

                    {!readOnly && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenCalculatorForItem(idx)}
                            className="p-1 rounded text-[#64748B] hover:text-[#102F57] hover:bg-[#EEF3F9]"
                            title="Recalculate with formula"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(idx)}
                            className="p-1 rounded text-[#64748B] hover:text-[#102F57] hover:bg-[#EEF3F9]"
                            title={t("estimates.duplicate_item")}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePushRateToLibrary(item)}
                            className="p-1 rounded text-[#64748B] hover:text-[#16835D] hover:bg-emerald-50 transition-colors"
                            title="Save / Update this rate in organization Rate Library"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5 text-[#16835D]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 rounded text-[#64748B] hover:text-[#C62828] hover:bg-red-50"
                            title={t("estimates.delete_item")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Add New Custom Item Inline Row */}
              {showAddRow && !readOnly && (
                <tr className="bg-[#FFF6EB]/40 border-t-2 border-[#F7931E]">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={draftItem.item_number}
                      onChange={(e) => setDraftItem({ ...draftItem, item_number: e.target.value })}
                      className="w-full text-xs border border-[#DCE4EE] rounded px-1.5 py-1 text-center font-mono bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      placeholder="Custom item description (e.g. M25 slab concrete / plastering)"
                      value={draftItem.description}
                      onChange={(e) => setDraftItem({ ...draftItem, description: e.target.value })}
                      className="w-full text-xs border border-[#DCE4EE] rounded px-2 py-1 bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={draftItem.category}
                      onChange={(e) => setDraftItem({ ...draftItem, category: e.target.value })}
                      className="w-full text-xs border border-[#DCE4EE] rounded px-1.5 py-1 bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    >
                      <option value="earthwork">Earthwork</option>
                      <option value="concrete">Concrete</option>
                      <option value="masonry">Masonry</option>
                      <option value="plaster">Plaster</option>
                      <option value="flooring">Flooring</option>
                      <option value="painting">Painting</option>
                      <option value="steel">Steel Reinforcement</option>
                      <option value="roadwork">Roadwork</option>
                      <option value="general">General</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="any"
                      value={draftItem.quantity}
                      onChange={(e) => setDraftItem({ ...draftItem, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs border border-[#DCE4EE] rounded px-1.5 py-1 text-right font-mono bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={draftItem.unit}
                      onChange={(e) => setDraftItem({ ...draftItem, unit: e.target.value })}
                      className="w-full text-xs border border-[#DCE4EE] rounded px-1.5 py-1 text-center font-mono bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="any"
                      placeholder="Rate ₹"
                      value={draftItem.unit_rate}
                      onChange={(e) => setDraftItem({ ...draftItem, unit_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs border border-[#DCE4EE] rounded px-1.5 py-1 text-right font-mono bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-[#102F57]">
                    {(draftItem.quantity * draftItem.unit_rate).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenCalculatorForItem(null)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-white border border-[#F7931E] text-[#102F57] hover:bg-[#FFF6EB] font-devanagari"
                    >
                      <Calculator className="w-3 h-3 text-[#F7931E]" />
                      {draftItem.is_manual ? t("estimates.calculate") : (draftItem.calculation_type || "Calculated")}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!draftItem.description.trim()}
                        className="p-1 rounded bg-[#16835D] text-white hover:bg-[#126b4c] disabled:opacity-50"
                        title="Add item"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddRow(false)}
                        className="p-1 rounded bg-gray-200 text-[#263445] hover:bg-gray-300"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action Trigger Bar */}
        {!readOnly && (
          <div className="p-3 bg-[#F3F6FA] border-t border-[#DCE4EE] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddRow(true)}
                className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 font-devanagari"
              >
                <Plus className="w-3.5 h-3.5 text-[#F7931E]" />
                <span>{t("estimates.add_item")}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenRatePicker}
                className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 font-devanagari"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#102F57]" />
                <span>{t("rates.importToBoq")}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenCalculatorForItem(null)}
              className="btn-accent px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 font-devanagari"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{t("estimates.open_calculator")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Financial Summary & Tax Breakdown Card (No Discount) */}
      <div className="flex flex-col md:flex-row justify-between gap-6 p-5 rounded-xl bg-white border border-[#DCE4EE] shadow-sm">
        {/* Configurable Rates Panel: Overhead, Contingency, GST */}
        <div className="w-full lg:w-7/12">
          <ContractorRatesSection
            values={{
              overheadPct,
              contingencyPct,
              gstPct,
            }}
            onChange={(newRates) =>
              onPercentagesChange?.({
                overheadPct: newRates.overheadPct,
                contingencyPct: newRates.contingencyPct,
                gstPct: newRates.gstPct,
              })
            }
            readOnly={readOnly}
          />
        </div>

        {/* Monetary Totals Breakdown (Strictly without Discount) */}
        <div className="w-full lg:w-5/12 lg:max-w-md space-y-2 border-t lg:border-t-0 lg:border-l border-[#DCE4EE] pt-4 lg:pt-0 lg:pl-6 text-xs">
          <div className="flex justify-between py-1 text-[#64748B] font-devanagari">
            <span>{t("estimates.subtotal")}</span>
            <span className="font-mono font-medium text-[#263445]">{formatIndianCurrency(totals.subtotal)}</span>
          </div>

          {overheadPct > 0 && (
            <div className="flex justify-between py-1 text-[#64748B] font-devanagari">
              <span>{t("estimates.overhead")} (+{overheadPct}%)</span>
              <span className="font-mono text-[#263445]">{formatIndianCurrency(totals.overheadAmount)}</span>
            </div>
          )}

          {contingencyPct > 0 && (
            <div className="flex justify-between py-1 text-[#64748B] font-devanagari">
              <span>{t("estimates.contingency")} (+{contingencyPct}%)</span>
              <span className="font-mono text-[#263445]">{formatIndianCurrency(totals.contingencyAmount)}</span>
            </div>
          )}

          <div className="flex justify-between py-1 font-semibold text-[#102F57] border-t border-[#DCE4EE] pt-2 font-devanagari">
            <span>{t("estimates.taxable_amount")}</span>
            <span className="font-mono">{formatIndianCurrency(totals.taxableAmount)}</span>
          </div>

          <div className="flex justify-between py-1 text-[#64748B] font-devanagari">
            <span>{gstPct > 0 ? `GST (${gstPct}%)` : (t("estimates.tax_unconfigured") || "Tax not configured (0%)")}</span>
            <span className="font-mono text-[#263445]">{formatIndianCurrency(totals.gstAmount)}</span>
          </div>

          <div className="flex justify-between py-2 text-base font-bold text-[#102F57] border-t-2 border-[#102F57] pt-2">
            <span>{t("estimates.total_amount")}</span>
            <span className="font-mono text-[#102F57]">
              {formatIndianCurrency(totals.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Measurement Calculator Modal */}
      {showCalculator && (
        <MeasurementCalculatorModal
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          onApply={handleApplyCalculator}
          initialFormula={
            calculatorItemIndex !== null && items[calculatorItemIndex]?.calculation_type
              ? (items[calculatorItemIndex].calculation_type as FormulaType)
              : "area"
          }
          initialDetails={
            calculatorItemIndex !== null ? items[calculatorItemIndex]?.calculation_details : undefined
          }
        />
      )}

      {/* Rate Library Picker Modal with Quantity Input & Line Amount Calculation */}
      {showRatePicker && (
        <Modal
          isOpen={showRatePicker}
          onClose={() => {
            setShowRatePicker(false);
            setSelectedRateItem(null);
          }}
          title={t("rates.importToBoq")}
          maxWidth="lg"
        >
          <div className="space-y-4 font-devanagari text-xs">
            <p className="text-[#64748B]">
              {t("rates.selectItemPrompt")}
            </p>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder={t("rates.searchPlaceholder")}
                value={rateSearch}
                onChange={(e) => setRateSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-[#DCE4EE] rounded-lg bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
              />
            </div>

            {loadingRates ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                {t("common.loading")}...
              </div>
            ) : rateItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                {t("rates.emptyTitle")}.{" "}
                <Link href="/rate-library" className="text-[#F7931E] hover:underline font-semibold">
                  {t("rates.addItem")}
                </Link>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-[#DCE4EE] border border-[#DCE4EE] rounded-lg">
                {rateItems
                  .filter(
                    (it) =>
                      !rateSearch.trim() ||
                      it.name.toLowerCase().includes(rateSearch.toLowerCase()) ||
                      it.category.toLowerCase().includes(rateSearch.toLowerCase()) ||
                      (it.description && it.description.toLowerCase().includes(rateSearch.toLowerCase()))
                  )
                  .map((it) => {
                    const unitRate = Number(it.combined_rate || it.material_rate || 0);
                    const isSelected = selectedRateItem?.id === it.id;
                    return (
                      <div
                        key={it.id}
                        onClick={() => handleSelectRateItemForConfig(it)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-[#FFF6EB] border-l-4 border-[#F7931E]" : "hover:bg-[#F3F6FA]"
                        }`}
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#102F57]">{it.name}</span>
                            {it.code && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#E8EEF5] text-[#102F57]">
                                {it.code}
                              </span>
                            )}
                            {(it.rate_type === "completed_work" || it.category === "composite") && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                                Completed Work
                              </span>
                            )}
                          </div>
                          {it.specification && (
                            <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                              {it.specification}
                            </div>
                          )}
                          <div className="text-[11px] text-[#64748B] flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="capitalize font-medium">{it.category}</span>
                            <span>•</span>
                            <span>Unit: {it.unit}</span>
                            {it.supplier_or_source_name && (
                              <>
                                <span>•</span>
                                <span>{it.supplier_or_source_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-[#102F57]">
                            ₹{unitRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-[#64748B]">per {it.unit}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Selected Item Review & Quantity Input */}
            {selectedRateItem && (
              <div className="p-3 bg-[#F3F6FA] border border-[#DCE4EE] rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#102F57]">
                      Selected: {selectedRateItem.name}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Unit Rate: ₹{Number(selectedRateItem.combined_rate || selectedRateItem.material_rate).toFixed(2)} per {selectedRateItem.unit}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DCE4EE]">
                  <div>
                    <label className="block text-[11px] text-[#263445] font-semibold mb-1">
                      Required Quantity ({selectedRateItem.unit}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={pickerQuantity}
                      onChange={(e) => setPickerQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-[#DCE4EE] rounded-lg text-xs font-mono font-bold bg-white text-[#263445] focus:outline-hidden focus:ring-1 focus:ring-[#102F57]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#263445] font-semibold mb-1">
                      Calculated Line Amount (₹)
                    </label>
                    <div className="px-2.5 py-1.5 bg-white border border-[#DCE4EE] rounded-lg text-xs font-mono font-bold text-[#102F57]">
                      ₹
                      {(
                        pickerQuantity * Number(selectedRateItem.combined_rate || selectedRateItem.material_rate)
                      ).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRateItem(null)}
                    className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
                  >
                    Change Item
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddFromLibrary}
                    className="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Add to BOQ
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Explicit Refresh Rate Confirmation Modal */}
      {refreshTarget && (
        <Modal
          isOpen={!!refreshTarget}
          onClose={() => setRefreshTarget(null)}
          title="Refresh BOQ Rate from Rate Library"
          maxWidth="sm"
        >
          <div className="space-y-4 font-devanagari text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <div className="font-bold text-amber-900">{refreshTarget.itemDescription}</div>
              <p className="text-[11px] text-amber-800">
                A newer rate is available in your Rate Library. Previously saved estimates are protected from silent changes. Confirm below to apply the updated rate to this item.
              </p>
            </div>

            <div className="divide-y divide-[#DCE4EE] border border-[#DCE4EE] rounded-lg text-xs font-mono bg-white">
              <div className="p-2.5 flex justify-between">
                <span className="text-[#64748B]">Current Saved Rate:</span>
                <span className="font-bold text-[#263445]">
                  ₹{refreshTarget.currentRate.toFixed(2)} / {refreshTarget.unit}
                </span>
              </div>
              <div className="p-2.5 flex justify-between bg-emerald-50/50">
                <span className="text-[#16835D] font-semibold">Latest Library Rate:</span>
                <span className="font-bold text-[#16835D]">
                  ₹{refreshTarget.latestRate.toFixed(2)} / {refreshTarget.unit}
                </span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span className="text-[#64748B]">Updated Line Amount:</span>
                <span className="font-bold text-[#102F57]">
                  ₹{(refreshTarget.quantity * refreshTarget.latestRate).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE4EE]">
              <button
                type="button"
                onClick={() => setRefreshTarget(null)}
                className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs"
              >
                Keep Existing Rate
              </button>
              <button
                type="button"
                onClick={confirmRefreshRate}
                className="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold"
              >
                Update Rate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
