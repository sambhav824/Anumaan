"use client";

import React, { useState } from "react";
import { BOQItem } from "../lib/api";
import { useTranslation } from "../context/I18nContext";
import {
  calculateEstimateTotals,
  formatIndianCurrency,
} from "../lib/calculations";
import { MeasurementCalculatorModal, FormulaType } from "./MeasurementCalculatorModal";
import { ContractorRatesSection } from "./ContractorRatesSection";
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
} from "lucide-react";

interface BOQTableProps {
  items: BOQItem[];
  onItemsChange: (items: BOQItem[]) => void;
  overheadPct?: number;
  contingencyPct?: number;
  discountPct?: number;
  gstPct?: number;
  onPercentagesChange?: (rates: {
    overheadPct: number;
    contingencyPct: number;
    discountPct: number;
    gstPct: number;
  }) => void;
  readOnly?: boolean;
}

export function BOQTable({
  items,
  onItemsChange,
  overheadPct = 0,
  contingencyPct = 0,
  discountPct = 0,
  gstPct = 0,
  onPercentagesChange,
  readOnly = false,
}: BOQTableProps) {
  const { t, locale } = useTranslation();

  // Active editing or adding index
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [calculatorItemIndex, setCalculatorItemIndex] = useState<number | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

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

  // Calculate live financial summary
  const totals = calculateEstimateTotals(
    items.map((it) => ({ quantity: it.quantity, unit_rate: it.unit_rate })),
    overheadPct,
    contingencyPct,
    discountPct,
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
      <div className="border border-anumaan-border rounded-xl bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-anumaan-beige-50/70 border-b border-anumaan-border text-anumaan-charcoal-700 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 w-16 text-center">{t("estimates.item_number")}</th>
                <th className="py-3 px-4 min-w-[200px]">{t("estimates.description")}</th>
                <th className="py-3 px-3 w-28">{t("estimates.category")}</th>
                <th className="py-3 px-3 w-24 text-right">{t("estimates.quantity")}</th>
                <th className="py-3 px-3 w-20 text-center">{t("estimates.unit")}</th>
                <th className="py-3 px-3 w-28 text-right">{t("estimates.unit_rate")}</th>
                <th className="py-3 px-3 w-32 text-right">{t("estimates.amount")}</th>
                <th className="py-3 px-3 w-28 text-center">{t("estimates.calculation")}</th>
                {!readOnly && <th className="py-3 px-3 w-24 text-center">{t("common.actions")}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-anumaan-border-light text-anumaan-charcoal-900">
              {items.length === 0 && !showAddRow && (
                <tr>
                  <td colSpan={readOnly ? 8 : 9} className="py-8 text-center text-anumaan-charcoal-400 font-devanagari">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40 text-anumaan-gold-600" />
                    {t("estimates.empty_boq_notice")}
                  </td>
                </tr>
              )}

              {items.map((item, idx) => {
                const amount = item.amount || Math.round(item.quantity * item.unit_rate * 100) / 100;
                return (
                  <tr key={item.id || idx} className="hover:bg-anumaan-beige-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-anumaan-charcoal-600">
                      {item.item_number}
                    </td>
                    <td className="py-2.5 px-4 font-medium">{item.description}</td>
                    <td className="py-2.5 px-3 text-anumaan-charcoal-600 font-devanagari">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-anumaan-beige-100 text-anumaan-charcoal-700">
                        {t(`boqCategories.${item.category}`) || item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      {Number(item.quantity).toLocaleString("en-IN", { maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-2.5 px-3 text-center text-anumaan-charcoal-600 font-mono text-[11px]">
                      {t(`units.${item.unit}`) || item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {Number(item.unit_rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-anumaan-charcoal-900">
                      {amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-anumaan-gold-50 border border-anumaan-gold-500/40 text-anumaan-gold-700 font-medium hover:bg-anumaan-gold-100 transition-colors font-devanagari"
                          title={item.calculation_details?.formula || "Calculated using IS 1200 formula"}
                        >
                          <Calculator className="w-2.5 h-2.5" />
                          {item.calculation_type ? (locale === "en" ? (item.calculation_type || "Calculated") : (t(`calcTypes.${item.calculation_type}`) || item.calculation_type)) : (t("estimates.calculated") || "Calculated")}
                        </button>
                      )}
                    </td>

                    {!readOnly && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenCalculatorForItem(idx)}
                            className="p-1 rounded text-anumaan-charcoal-500 hover:text-anumaan-gold-600 hover:bg-anumaan-gold-50"
                            title="Recalculate with formula"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(idx)}
                            className="p-1 rounded text-anumaan-charcoal-500 hover:text-anumaan-charcoal-900 hover:bg-anumaan-beige-100"
                            title={t("estimates.duplicate_item")}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
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

              {/* Add New Item Inline Row */}
              {showAddRow && !readOnly && (
                <tr className="bg-anumaan-gold-50/30 border-t-2 border-anumaan-gold-500/40">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={draftItem.item_number}
                      onChange={(e) => setDraftItem({ ...draftItem, item_number: e.target.value })}
                      className="w-full text-xs border border-anumaan-border rounded px-1.5 py-1 text-center font-mono"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      placeholder="Item description (e.g., M25 grade slab concrete)"
                      value={draftItem.description}
                      onChange={(e) => setDraftItem({ ...draftItem, description: e.target.value })}
                      className="w-full text-xs border border-anumaan-border rounded px-2 py-1"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={draftItem.category}
                      onChange={(e) => setDraftItem({ ...draftItem, category: e.target.value })}
                      className="w-full text-xs border border-anumaan-border rounded px-1.5 py-1 bg-white"
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
                      className="w-full text-xs border border-anumaan-border rounded px-1.5 py-1 text-right font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={draftItem.unit}
                      onChange={(e) => setDraftItem({ ...draftItem, unit: e.target.value })}
                      className="w-full text-xs border border-anumaan-border rounded px-1.5 py-1 text-center font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="any"
                      placeholder="Rate ₹"
                      value={draftItem.unit_rate}
                      onChange={(e) => setDraftItem({ ...draftItem, unit_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs border border-anumaan-border rounded px-1.5 py-1 text-right font-mono"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-anumaan-charcoal-900">
                    {(draftItem.quantity * draftItem.unit_rate).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenCalculatorForItem(null)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-white border border-anumaan-gold-500 text-anumaan-gold-700 hover:bg-anumaan-gold-50 font-devanagari"
                    >
                      <Calculator className="w-3 h-3" />
                      {draftItem.is_manual ? t("estimates.calculate") : (t(`calcTypes.${draftItem.calculation_type}`) || draftItem.calculation_type)}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!draftItem.description.trim()}
                        className="p-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        title="Add item"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddRow(false)}
                        className="p-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
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

        {/* Add Item Trigger Bar */}
        {!readOnly && (
          <div className="p-3 bg-anumaan-beige-50/60 border-t border-anumaan-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAddRow(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-anumaan-border text-anumaan-charcoal-800 hover:bg-anumaan-beige-100 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-anumaan-gold-600" />
              {t("estimates.add_item")}
            </button>

            <button
              type="button"
              onClick={() => handleOpenCalculatorForItem(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-anumaan-gold-50 border border-anumaan-gold-500/50 text-anumaan-gold-700 hover:bg-anumaan-gold-100 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              {t("estimates.open_calculator")}
            </button>
          </div>
        )}
      </div>

      {/* Financial Summary & Tax Breakdown Card */}
      <div className="flex flex-col md:flex-row justify-between gap-6 p-5 rounded-xl bg-gradient-to-br from-white to-anumaan-beige-50 border border-anumaan-border shadow-xs">
        {/* Configurable Rates Panel */}
        <div className="w-full lg:w-7/12">
          <ContractorRatesSection
            values={{
              overheadPct,
              contingencyPct,
              discountPct,
              gstPct,
            }}
            onChange={(newRates) =>
              onPercentagesChange?.({
                overheadPct: newRates.overheadPct,
                contingencyPct: newRates.contingencyPct,
                discountPct: newRates.discountPct,
                gstPct: newRates.gstPct,
              })
            }
            readOnly={readOnly}
          />
        </div>

        {/* Monetary Totals Breakdown */}
        <div className="w-full lg:w-5/12 lg:max-w-md space-y-2 border-t lg:border-t-0 lg:border-l border-anumaan-border-light pt-4 lg:pt-0 lg:pl-6 text-xs">
          <div className="flex justify-between py-1 text-anumaan-charcoal-600 font-devanagari">
            <span>{t("estimates.subtotal")}</span>
            <span className="font-mono font-medium">{formatIndianCurrency(totals.subtotal)}</span>
          </div>

          {overheadPct > 0 && (
            <div className="flex justify-between py-1 text-anumaan-charcoal-600 font-devanagari">
              <span>{t("estimates.overhead")} (+{overheadPct}%)</span>
              <span className="font-mono">{formatIndianCurrency(totals.overheadAmount)}</span>
            </div>
          )}

          {contingencyPct > 0 && (
            <div className="flex justify-between py-1 text-anumaan-charcoal-600 font-devanagari">
              <span>{t("estimates.contingency")} (+{contingencyPct}%)</span>
              <span className="font-mono">{formatIndianCurrency(totals.contingencyAmount)}</span>
            </div>
          )}

          {discountPct > 0 && (
            <div className="flex justify-between py-1 text-emerald-700 font-devanagari">
              <span>{t("estimates.discount")} (-{discountPct}%)</span>
              <span className="font-mono">-{formatIndianCurrency(totals.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between py-1 font-semibold text-anumaan-charcoal-800 border-t border-anumaan-border-light pt-2 font-devanagari">
            <span>{t("estimates.taxable_amount")}</span>
            <span className="font-mono">{formatIndianCurrency(totals.taxableAmount)}</span>
          </div>

          <div className="flex justify-between py-1 text-anumaan-charcoal-600 font-devanagari">
            <span>{gstPct > 0 ? `GST (${gstPct}%)` : (t("estimates.tax_unconfigured") || "Tax not configured (0%)")}</span>
            <span className="font-mono">{formatIndianCurrency(totals.gstAmount)}</span>
          </div>

          <div className="flex justify-between py-2 text-base font-bold text-anumaan-charcoal-900 border-t-2 border-anumaan-gold-500/50 pt-2">
            <span>{t("estimates.total_amount")}</span>
            <span className="font-mono text-anumaan-gold-700">
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
              : "excavation"
          }
          initialDetails={
            calculatorItemIndex !== null ? items[calculatorItemIndex]?.calculation_details : undefined
          }
        />
      )}
    </div>
  );
}
