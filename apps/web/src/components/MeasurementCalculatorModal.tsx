"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { useTranslation } from "../context/I18nContext";
import {
  calculateExcavation,
  calculateConcrete,
  calculateSlabConcrete,
  calculateBrickwork,
  calculatePlaster,
  calculateFlooring,
  calculatePainting,
  calculateReinforcement,
  calculateRoadLayers,
  calculateRoadCrossSections,
  CalculationResult,
  OpeningDimension,
  ReinforcementBar,
} from "../lib/calculations";
import {
  Calculator,
  Plus,
  Trash2,
  Check,
  Layers,
  Ruler,
  Info,
} from "lucide-react";

export type FormulaType =
  | "excavation"
  | "concrete"
  | "slab_concrete"
  | "brickwork"
  | "plaster"
  | "flooring"
  | "painting"
  | "reinforcement"
  | "road_layers"
  | "road_cross_sections";

interface MeasurementCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (quantity: number, unit: string, calculationType: FormulaType, calculationDetails: any) => void;
  initialFormula?: FormulaType;
  initialDetails?: any;
}

export function MeasurementCalculatorModal({
  isOpen,
  onClose,
  onApply,
  initialFormula = "excavation",
  initialDetails,
}: MeasurementCalculatorModalProps) {
  const { t } = useTranslation();
  const [formulaType, setFormulaType] = useState<FormulaType>(initialFormula);
  const [unit, setUnit] = useState<string>("m");

  // Form states
  const [length, setLength] = useState<number>(10);
  const [width, setWidth] = useState<number>(5);
  const [depth, setDepth] = useState<number>(2);
  const [height, setHeight] = useState<number>(3);
  const [thickness, setThickness] = useState<number>(0.23);
  const [area, setArea] = useState<number>(100);
  const [sides, setSides] = useState<number>(1);
  const [coats, setCoats] = useState<number>(2);
  const [coverage, setCoverage] = useState<number>(10);
  const [wastagePct, setWastagePct] = useState<number>(2.0);
  const [swellFactor, setSwellFactor] = useState<number>(0.20);
  const [compactionFactor, setCompactionFactor] = useState<number>(1.25);

  // Openings (for brickwork, plaster)
  const [openings, setOpenings] = useState<OpeningDimension[]>([
    { length: 1.2, height: 2.1, count: 1, description: "Door D1" },
  ]);

  // BBS Reinforcement Bars
  const [bars, setBars] = useState<ReinforcementBar[]>([
    { diameter_mm: 12, length: 10, count: 20, description: "Main Bottom Bar" },
    { diameter_mm: 8, length: 1.2, count: 40, description: "Stirrups" },
  ]);

  // Road Cross-sections
  const [area1, setArea1] = useState<number>(25);
  const [area2, setArea2] = useState<number>(35);
  const [distance, setDistance] = useState<number>(50);

  // Live calculated result
  const [result, setResult] = useState<CalculationResult | null>(null);

  useEffect(() => {
    if (initialFormula) setFormulaType(initialFormula);
    if (initialDetails) {
      if (initialDetails.length !== undefined) setLength(initialDetails.length);
      if (initialDetails.width !== undefined) setWidth(initialDetails.width);
      if (initialDetails.depth !== undefined) setDepth(initialDetails.depth);
      if (initialDetails.height !== undefined) setHeight(initialDetails.height);
      if (initialDetails.thickness !== undefined) setThickness(initialDetails.thickness);
      if (initialDetails.area !== undefined) setArea(initialDetails.area);
    }
  }, [initialFormula, initialDetails, isOpen]);

  // Recalculate on any input change
  useEffect(() => {
    try {
      let res: CalculationResult;
      switch (formulaType) {
        case "excavation":
          res = calculateExcavation(length, width, depth, unit, swellFactor);
          break;
        case "concrete":
          res = calculateConcrete(length, width, thickness, unit, wastagePct);
          break;
        case "slab_concrete":
          res = calculateSlabConcrete(area, thickness, unit === "m" ? "sqm" : "sqft", unit, wastagePct);
          break;
        case "brickwork":
          res = calculateBrickwork(length, height, thickness, openings, unit, wastagePct);
          break;
        case "plaster":
          res = calculatePlaster(length, height, sides, openings, unit, wastagePct);
          break;
        case "flooring":
          res = calculateFlooring(length, width, undefined, unit, unit === "m" ? "sqm" : "sqft", wastagePct);
          break;
        case "painting":
          res = calculatePainting(area, coats, coverage, unit === "m" ? "sqm" : "sqft");
          break;
        case "reinforcement":
          res = calculateReinforcement(bars, wastagePct);
          break;
        case "road_layers":
          res = calculateRoadLayers(length, width, thickness, compactionFactor, unit);
          break;
        case "road_cross_sections":
          res = calculateRoadCrossSections(area1, area2, distance, unit === "m" ? "sqm" : "sqft", unit);
          break;
      }
      setResult(res);
    } catch (err) {
      console.error("Calculation error:", err);
    }
  }, [
    formulaType,
    unit,
    length,
    width,
    depth,
    height,
    thickness,
    area,
    sides,
    coats,
    coverage,
    wastagePct,
    swellFactor,
    compactionFactor,
    openings,
    bars,
    area1,
    area2,
    distance,
  ]);

  const handleAddOpening = () => {
    setOpenings([
      ...openings,
      { length: 1.0, height: 1.2, count: 1, description: `Window W${openings.length + 1}` },
    ]);
  };

  const handleRemoveOpening = (index: number) => {
    setOpenings(openings.filter((_, i) => i !== index));
  };

  const handleAddBar = () => {
    setBars([
      ...bars,
      { diameter_mm: 16, length: 10, count: 10, description: `Bar ${bars.length + 1}` },
    ]);
  };

  const handleRemoveBar = (index: number) => {
    setBars(bars.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    if (!result) return;
    const details = {
      formula_type: formulaType,
      unit,
      formula: result.formula,
      ...result.breakdown,
    };
    onApply(result.quantity, result.unit, formulaType, details);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t("estimates.open_calculator")} (IS 1200)`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Formula Selection Tabs */}
        <div>
          <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-2">
            {t("estimates.select_formula")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "excavation", label: t("calcTypes.excavation"), sub: "L × W × D" },
              { id: "concrete", label: t("calcTypes.concrete"), sub: "L × W × T" },
              { id: "slab_concrete", label: t("calcTypes.slab_concrete"), sub: "Area × T" },
              { id: "brickwork", label: t("calcTypes.brickwork"), sub: "IS Openings" },
              { id: "plaster", label: t("calcTypes.plaster"), sub: "IS 1200 Deduction" },
              { id: "flooring", label: t("calcTypes.flooring"), sub: "Area + Wastage" },
              { id: "painting", label: t("calcTypes.painting"), sub: "Coats ÷ Coverage" },
              { id: "reinforcement", label: t("calcTypes.reinforcement"), sub: "BBS (d²/162)" },
              { id: "road_layers", label: t("calcTypes.road_layers"), sub: "Compacted & Loose" },
              { id: "road_cross_sections", label: t("calcTypes.road_cross_sections"), sub: "Average End Area" },
            ].map((f) => {
              const active = formulaType === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormulaType(f.id as FormulaType)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    active
                      ? "border-anumaan-gold-500 bg-anumaan-gold-50/70 text-anumaan-charcoal-900 shadow-xs"
                      : "border-anumaan-border bg-white text-anumaan-charcoal-600 hover:bg-anumaan-beige-50"
                  }`}
                >
                  <span className="text-xs font-semibold">{f.label}</span>
                  <span className="text-[10px] text-anumaan-charcoal-400 mt-0.5">{f.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Measurement Dimensions Form */}
        <div className="p-4 bg-anumaan-beige-50/60 rounded-xl border border-anumaan-border space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-anumaan-border-light">
            <span className="text-xs font-semibold text-anumaan-charcoal-800 uppercase tracking-wider flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-anumaan-gold-600" />
              {t("estimates.dimensions_and_params")}
            </span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-anumaan-charcoal-500">{t("estimates.unit_label")}</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="text-xs font-medium border border-anumaan-border rounded-md px-2 py-1 bg-white text-anumaan-charcoal-800"
              >
                <option value="m">{t("estimates.metres_m")}</option>
                <option value="ft">{t("estimates.feet_ft")}</option>
              </select>
            </div>
          </div>

          {/* Conditional Input Rows */}
          {["excavation", "concrete", "brickwork", "plaster", "flooring", "road_layers"].includes(formulaType) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                  {t("estimates.length")} ({unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-anumaan-gold-500"
                />
              </div>

              {["excavation", "concrete", "flooring", "road_layers"].includes(formulaType) && (
                <div>
                  <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                    {t("estimates.width")} ({unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-anumaan-gold-500"
                  />
                </div>
              )}

              {formulaType === "excavation" && (
                <div>
                  <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                    {t("estimates.depth")} ({unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={depth}
                    onChange={(e) => setDepth(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-anumaan-gold-500"
                  />
                </div>
              )}

              {["brickwork", "plaster"].includes(formulaType) && (
                <div>
                  <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                    {t("estimates.height")} ({unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-anumaan-gold-500"
                  />
                </div>
              )}

              {["concrete", "brickwork", "road_layers"].includes(formulaType) && (
                <div>
                  <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                    {t("estimates.thickness")} ({unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={thickness}
                    onChange={(e) => setThickness(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-anumaan-gold-500"
                  />
                </div>
              )}

              {formulaType === "plaster" && (
                <div>
                  <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                    {t("estimates.faces_sides")}
                  </label>
                  <select
                    value={sides}
                    onChange={(e) => setSides(parseInt(e.target.value) || 1)}
                    className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900"
                  >
                    <option value={1}>{t("estimates.single_face")}</option>
                    <option value={2}>{t("estimates.both_faces")}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Slab Concrete / Painting Inputs */}
          {["slab_concrete", "painting"].includes(formulaType) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                  {t("estimates.area")} ({unit === "m" ? "sqm" : "sqft"})
                </label>
                <input
                  type="number"
                  step="any"
                  value={area}
                  onChange={(e) => setArea(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900"
                />
              </div>

              {formulaType === "slab_concrete" && (
                <div>
                  <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                    {t("estimates.thickness")} ({unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={thickness}
                    onChange={(e) => setThickness(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900"
                  />
                </div>
              )}

              {formulaType === "painting" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                      {t("estimates.coats")}
                    </label>
                    <input
                      type="number"
                      value={coats}
                      onChange={(e) => setCoats(parseInt(e.target.value) || 1)}
                      className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                      {t("estimates.coverage")} (sqm/L)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={coverage}
                      onChange={(e) => setCoverage(parseFloat(e.target.value) || 1)}
                      className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Road Cross-Sections Inputs */}
          {formulaType === "road_cross_sections" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                  {t("estimates.section1_area")} ({unit === "m" ? "sqm" : "sqft"})
                </label>
                <input
                  type="number"
                  step="any"
                  value={area1}
                  onChange={(e) => setArea1(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                  {t("estimates.section2_area")} ({unit === "m" ? "sqm" : "sqft"})
                </label>
                <input
                  type="number"
                  step="any"
                  value={area2}
                  onChange={(e) => setArea2(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-anumaan-charcoal-600 mb-1">
                  {t("estimates.distance")} ({unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={distance}
                  onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border border-anumaan-border rounded-lg px-3 py-1.5 bg-white text-anumaan-charcoal-900"
                />
              </div>
            </div>
          )}

          {/* Reinforcement BBS Table */}
          {formulaType === "reinforcement" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-anumaan-charcoal-700">{t("estimates.bar_schedule_items")}</span>
                <button
                  type="button"
                  onClick={handleAddBar}
                  className="text-xs text-anumaan-gold-700 hover:text-anumaan-gold-600 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("estimates.add_bar")}
                </button>
              </div>
              <div className="space-y-2">
                {bars.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-anumaan-border">
                    <input
                      type="text"
                      placeholder={t("estimates.bar_tag")}
                      value={b.description || ""}
                      onChange={(e) => {
                        const copy = [...bars];
                        copy[idx].description = e.target.value;
                        setBars(copy);
                      }}
                      className="text-xs border border-anumaan-border rounded px-2 py-1 w-28 text-anumaan-charcoal-900"
                    />
                    <select
                      value={b.diameter_mm}
                      onChange={(e) => {
                        const copy = [...bars];
                        copy[idx].diameter_mm = parseInt(e.target.value);
                        setBars(copy);
                      }}
                      className="text-xs border border-anumaan-border rounded px-2 py-1 bg-white text-anumaan-charcoal-900 font-medium"
                    >
                      {[8, 10, 12, 16, 20, 25, 32].map((dia) => (
                        <option key={dia} value={dia}>
                          {dia} mm ({((dia * dia) / 162).toFixed(3)} kg/m)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="any"
                      placeholder={`${t("estimates.length")} (m)`}
                      value={b.length}
                      onChange={(e) => {
                        const copy = [...bars];
                        copy[idx].length = parseFloat(e.target.value) || 0;
                        setBars(copy);
                      }}
                      className="text-xs border border-anumaan-border rounded px-2 py-1 w-20 text-anumaan-charcoal-900"
                    />
                    <input
                      type="number"
                      placeholder={t("estimates.count")}
                      value={b.count || 1}
                      onChange={(e) => {
                        const copy = [...bars];
                        copy[idx].count = parseInt(e.target.value) || 1;
                        setBars(copy);
                      }}
                      className="text-xs border border-anumaan-border rounded px-2 py-1 w-16 text-anumaan-charcoal-900"
                    />
                    {bars.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBar(idx)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Openings Section for Brickwork & Plaster */}
          {["brickwork", "plaster"].includes(formulaType) && (
            <div className="pt-2 border-t border-anumaan-border-light space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-anumaan-charcoal-700">
                  {t("estimates.openings")}
                </span>
                <button
                  type="button"
                  onClick={handleAddOpening}
                  className="text-xs text-anumaan-gold-700 hover:text-anumaan-gold-600 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> {t("estimates.add_opening")}
                </button>
              </div>

              {openings.map((op, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-anumaan-border">
                  <input
                    type="text"
                    placeholder={t("estimates.opening_desc_placeholder")}
                    value={op.description || ""}
                    onChange={(e) => {
                      const copy = [...openings];
                      copy[idx].description = e.target.value;
                      setOpenings(copy);
                    }}
                    className="text-xs border border-anumaan-border rounded px-2 py-1 w-32 text-anumaan-charcoal-900"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder={t("estimates.length")}
                    value={op.length}
                    onChange={(e) => {
                      const copy = [...openings];
                      copy[idx].length = parseFloat(e.target.value) || 0;
                      setOpenings(copy);
                    }}
                    className="text-xs border border-anumaan-border rounded px-2 py-1 w-20 text-anumaan-charcoal-900"
                  />
                  <span className="text-xs text-anumaan-charcoal-400">×</span>
                  <input
                    type="number"
                    step="any"
                    placeholder={t("estimates.height")}
                    value={op.height}
                    onChange={(e) => {
                      const copy = [...openings];
                      copy[idx].height = parseFloat(e.target.value) || 0;
                      setOpenings(copy);
                    }}
                    className="text-xs border border-anumaan-border rounded px-2 py-1 w-20 text-anumaan-charcoal-900"
                  />
                  <span className="text-xs text-anumaan-charcoal-400">{t("estimates.qty_short")}</span>
                  <input
                    type="number"
                    placeholder={t("estimates.count")}
                    value={op.count || 1}
                    onChange={(e) => {
                      const copy = [...openings];
                      copy[idx].count = parseInt(e.target.value) || 1;
                      setOpenings(copy);
                    }}
                    className="text-xs border border-anumaan-border rounded px-2 py-1 w-16 text-anumaan-charcoal-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOpening(idx)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Configurable Wastage / Factors */}
          <div className="flex items-center gap-4 pt-2 text-xs text-anumaan-charcoal-600">
            {["concrete", "slab_concrete", "brickwork", "plaster", "flooring", "reinforcement"].includes(formulaType) && (
              <div className="flex items-center gap-1.5">
                <span>{t("estimates.wastage")}:</span>
                <input
                  type="number"
                  step="0.5"
                  value={wastagePct}
                  onChange={(e) => setWastagePct(parseFloat(e.target.value) || 0)}
                  className="w-16 border border-anumaan-border rounded px-1.5 py-0.5 bg-white text-anumaan-charcoal-900 font-medium"
                />
              </div>
            )}
            {formulaType === "excavation" && (
              <div className="flex items-center gap-1.5">
                <span>{t("estimates.swell_factor")}:</span>
                <input
                  type="number"
                  step="0.05"
                  value={swellFactor}
                  onChange={(e) => setSwellFactor(parseFloat(e.target.value) || 0)}
                  className="w-16 border border-anumaan-border rounded px-1.5 py-0.5 bg-white text-anumaan-charcoal-900 font-medium"
                />
              </div>
            )}
          </div>
        </div>

        {/* Live Calculation Output Card */}
        {result && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-anumaan-beige-100 to-anumaan-gold-50/50 border border-anumaan-border shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-anumaan-gold-700 uppercase tracking-wider block">
                  {t("estimates.deterministic_quantity")}
                </span>
                <div className="text-2xl font-bold text-anumaan-charcoal-900 mt-0.5">
                  {result.quantity.toLocaleString("en-IN", { maximumFractionDigits: 4 })}{" "}
                  <span className="text-base font-medium text-anumaan-charcoal-600">{result.unit}</span>
                </div>
              </div>

              {/* Conversion badges */}
              <div className="text-right space-y-1">
                {result.standard_reference && (
                  <span className="inline-block text-[10px] font-semibold text-anumaan-charcoal-500 bg-white/80 px-2 py-0.5 rounded border border-anumaan-border">
                    {result.standard_reference}
                  </span>
                )}
                {result.breakdown?.litres_required !== undefined && (
                  <div className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs">
                    {result.breakdown.litres_required.toFixed(2)} {t("estimates.litres_required")}
                  </div>
                )}
                {result.brass_equivalent !== undefined && (
                  <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-anumaan-gold-500/40 text-anumaan-gold-700 shadow-2xs">
                    {result.brass_equivalent.toFixed(2)} {t("estimates.brass_equivalent_label")}
                  </span>
                )}
                {result.breakdown?.loose_volume_cum !== undefined && (
                  <div className="text-[11px] text-anumaan-charcoal-500">
                    {t("estimates.loose_vol_label")} {result.breakdown.loose_volume_cum.toFixed(2)} {t("units.cum")}
                  </div>
                )}
                {result.breakdown?.sqft_equivalent !== undefined && (
                  <span className="inline-block px-2 py-0.5 text-xs rounded-md bg-white border border-anumaan-border text-anumaan-charcoal-700">
                    {result.breakdown.sqft_equivalent.toFixed(1)} {t("estimates.sqft_label")}
                  </span>
                )}
                {result.breakdown?.tonnes !== undefined && (
                  <span className="inline-block px-2 py-0.5 text-xs rounded-md bg-white border border-anumaan-border text-anumaan-charcoal-700">
                    {result.breakdown.tonnes.toFixed(3)} {t("estimates.metric_tonnes_label")}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-anumaan-border-light text-xs text-anumaan-charcoal-700 font-mono bg-white/70 p-2.5 rounded-lg">
              <span className="font-semibold text-anumaan-charcoal-900">{t("estimates.formula_breakdown_heading")}: </span>
              {result.formula}
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-anumaan-border-light">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-anumaan-border bg-white text-anumaan-charcoal-700 hover:bg-anumaan-beige-50 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!result || result.quantity <= 0}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-anumaan-gold-600 text-white hover:bg-anumaan-gold-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {t("estimates.apply_calculation")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
