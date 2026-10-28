"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { useTranslation } from "../context/I18nContext";
import {
  calculateLength,
  calculateArea,
  calculateVolume,
  calculateWallArea,
  calculateCount,
  calculateWeight,
  calculateTime,
  calculateLumpSum,
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
  Clock,
  Scale,
  Hash,
  Square,
  Box,
} from "lucide-react";

export type FormulaType =
  // Basic Measurements
  | "length"
  | "area"
  | "volume"
  | "wall_area"
  | "count"
  | "weight"
  | "time"
  | "lump_sum"
  // Engineering Standards (IS 1200 / MoRTH)
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
  initialFormula = "area",
  initialDetails,
}: MeasurementCalculatorModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"basic" | "engineering">("basic");
  const [formulaType, setFormulaType] = useState<FormulaType>(initialFormula);
  const [unit, setUnit] = useState<string>("m");

  // Basic measurement inputs
  const [length, setLength] = useState<number>(10);
  const [width, setWidth] = useState<number>(5);
  const [height, setHeight] = useState<number>(3);
  const [depth, setDepth] = useState<number>(2);
  const [thickness, setThickness] = useState<number>(0.23);
  const [countVal, setCountVal] = useState<number>(10);
  const [weightVal, setWeightVal] = useState<number>(100);
  const [timeVal, setTimeVal] = useState<number>(8);
  const [lumpSumDesc, setLumpSumDesc] = useState<string>("Contractor preliminary work & site mobilization");

  // Engineering parameters
  const [area, setArea] = useState<number>(100);
  const [sides, setSides] = useState<number>(1);
  const [coats, setCoats] = useState<number>(2);
  const [coverage, setCoverage] = useState<number>(10);
  const [wastagePct, setWastagePct] = useState<number>(0.0);
  const [swellFactor, setSwellFactor] = useState<number>(0.0);
  const [compactionFactor, setCompactionFactor] = useState<number>(1.25);

  // Openings (for wall area, brickwork, plaster)
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
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    if (initialFormula) {
      setFormulaType(initialFormula);
      const isEng = [
        "excavation",
        "concrete",
        "slab_concrete",
        "brickwork",
        "plaster",
        "flooring",
        "painting",
        "reinforcement",
        "road_layers",
        "road_cross_sections",
      ].includes(initialFormula);
      setActiveTab(isEng ? "engineering" : "basic");
    }
    if (initialDetails) {
      if (initialDetails.length !== undefined) setLength(Number(initialDetails.length));
      if (initialDetails.width !== undefined) setWidth(Number(initialDetails.width));
      if (initialDetails.height !== undefined) setHeight(Number(initialDetails.height));
      if (initialDetails.depth !== undefined) setDepth(Number(initialDetails.depth));
      if (initialDetails.thickness !== undefined) setThickness(Number(initialDetails.thickness));
      if (initialDetails.area !== undefined) setArea(Number(initialDetails.area));
      if (initialDetails.unit !== undefined) setUnit(initialDetails.unit);
    }
  }, [initialFormula, initialDetails, isOpen]);

  // Recalculate on any input change
  useEffect(() => {
    try {
      setCalcError(null);
      let res: CalculationResult;

      switch (formulaType) {
        // Basic Measurement Types
        case "length":
          res = calculateLength(length, unit);
          break;
        case "area":
          res = calculateArea(length, width, unit);
          break;
        case "volume":
          res = calculateVolume(length, width, height, unit);
          break;
        case "wall_area":
          res = calculateWallArea(length, height, openings, unit);
          break;
        case "count":
          res = calculateCount(countVal, unit === "piece" ? "piece" : "nos");
          break;
        case "weight":
          res = calculateWeight(weightVal, unit === "tonne" ? "tonne" : "kg");
          break;
        case "time":
          res = calculateTime(timeVal, unit === "hour" ? "hour" : "day");
          break;
        case "lump_sum":
          res = calculateLumpSum(lumpSumDesc);
          break;

        // Engineering Standards (IS 1200 / MoRTH)
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
        default:
          res = calculateArea(length, width, unit);
      }
      setResult(res);
    } catch (err: any) {
      setCalcError(err?.message || "Invalid measurement dimensions.");
      setResult(null);
    }
  }, [
    formulaType,
    unit,
    length,
    width,
    height,
    depth,
    thickness,
    countVal,
    weightVal,
    timeVal,
    lumpSumDesc,
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
      unit: result.unit,
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
      title="मापन कॅल्क्युलेटर • Measurement-Based Quantity Calculator"
      maxWidth="xl"
    >
      <div className="space-y-5 font-devanagari text-xs">
        {/* Category Switcher Tabs: Basic vs Civil Engineering */}
        <div className="flex border-b border-[#DCE4EE]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("basic");
              if (!["length", "area", "volume", "wall_area", "count", "weight", "time", "lump_sum"].includes(formulaType)) {
                setFormulaType("area");
              }
            }}
            className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "basic"
                ? "border-[#F7931E] text-[#102F57]"
                : "border-transparent text-[#64748B] hover:text-[#102F57]"
            }`}
          >
            <Ruler className="w-3.5 h-3.5 text-[#F7931E]" />
            <span>1. Basic Measurements (L, W, H, Wall Area, Count)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("engineering");
              if (["length", "area", "volume", "wall_area", "count", "weight", "time", "lump_sum"].includes(formulaType)) {
                setFormulaType("excavation");
              }
            }}
            className={`pb-2.5 px-4 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "engineering"
                ? "border-[#F7931E] text-[#102F57]"
                : "border-transparent text-[#64748B] hover:text-[#102F57]"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#102F57]" />
            <span>2. Civil Engineering Standards (IS 1200 / MoRTH)</span>
          </button>
        </div>

        {/* Formula Selection Cards */}
        {activeTab === "basic" ? (
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
              Select Measurement Formula:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "length", label: "Length", formula: "Q = Length", icon: Ruler },
                { id: "area", label: "Area (L × W)", formula: "Q = L × W", icon: Square },
                { id: "volume", label: "Volume (L × W × H)", formula: "Q = L × W × H", icon: Box },
                { id: "wall_area", label: "Net Wall Area", formula: "Gross - Openings", icon: Layers },
                { id: "count", label: "Unit Count", formula: "Q = Nos / Pieces", icon: Hash },
                { id: "weight", label: "Weight", formula: "Q = kg / Tonnes", icon: Scale },
                { id: "time", label: "Time / Duration", formula: "Q = Hours / Days", icon: Clock },
                { id: "lump_sum", label: "Lump Sum", formula: "Fixed Scope (ls)", icon: Info },
              ].map((f) => {
                const active = formulaType === f.id;
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormulaType(f.id as FormulaType)}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                      active
                        ? "border-[#F7931E] bg-[#FFF6EB] text-[#102F57] shadow-2xs"
                        : "border-[#DCE4EE] bg-white text-[#263445] hover:bg-[#F3F6FA]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#102F57]">
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-[#F7931E]" : "text-[#64748B]"}`} />
                      <span>{f.label}</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] mt-0.5">{f.formula}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
              Select IS 1200 / MoRTH Standard:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "excavation", label: t("calcTypes.excavation"), sub: "IS 1200 Pt 1" },
                { id: "concrete", label: t("calcTypes.concrete"), sub: "IS 1200 Pt 2" },
                { id: "slab_concrete", label: t("calcTypes.slab_concrete"), sub: "Plan Area × T" },
                { id: "brickwork", label: t("calcTypes.brickwork"), sub: "IS 1200 Pt 3" },
                { id: "plaster", label: t("calcTypes.plaster"), sub: "IS 1200 Pt 12" },
                { id: "flooring", label: t("calcTypes.flooring"), sub: "IS 1200 Pt 11" },
                { id: "painting", label: t("calcTypes.painting"), sub: "IS 1200 Pt 13" },
                { id: "reinforcement", label: t("calcTypes.reinforcement"), sub: "IS 1786 BBS" },
                { id: "road_layers", label: t("calcTypes.road_layers"), sub: "MoRTH Sec 400" },
                { id: "road_cross_sections", label: t("calcTypes.road_cross_sections"), sub: "Avg End Area" },
              ].map((f) => {
                const active = formulaType === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormulaType(f.id as FormulaType)}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                      active
                        ? "border-[#102F57] bg-[#EEF3F9] text-[#102F57] shadow-2xs font-bold"
                        : "border-[#DCE4EE] bg-white text-[#263445] hover:bg-[#F3F6FA]"
                    }`}
                  >
                    <span className="text-xs font-bold">{f.label}</span>
                    <span className="text-[10px] text-[#64748B] mt-0.5">{f.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Dimensions Panel */}
        <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-amber-600" />
              <span>Enter Actual Dimensions</span>
            </span>

            {/* Applicable Unit Selector */}
            {["length", "area", "volume", "wall_area", "excavation", "concrete", "brickwork", "plaster", "flooring", "road_layers"].includes(formulaType) && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-stone-600 font-medium">Unit:</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="px-2 py-0.5 text-xs font-medium border border-stone-300 rounded bg-white"
                >
                  <option value="m">Metres (m / m² / m³)</option>
                  <option value="ft">Feet (ft / ft² / ft³)</option>
                </select>
              </div>
            )}

            {formulaType === "count" && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-stone-600 font-medium">Unit:</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="px-2 py-0.5 text-xs font-medium border border-stone-300 rounded bg-white"
                >
                  <option value="nos">nos (Numbers)</option>
                  <option value="piece">piece (Pieces)</option>
                </select>
              </div>
            )}

            {formulaType === "weight" && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-stone-600 font-medium">Unit:</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="px-2 py-0.5 text-xs font-medium border border-stone-300 rounded bg-white"
                >
                  <option value="kg">kg (Kilograms)</option>
                  <option value="tonne">tonne (Metric Tonnes)</option>
                </select>
              </div>
            )}

            {formulaType === "time" && (
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-stone-600 font-medium">Unit:</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="px-2 py-0.5 text-xs font-medium border border-stone-300 rounded bg-white"
                >
                  <option value="hour">hour (Hours)</option>
                  <option value="day">day (Days)</option>
                </select>
              </div>
            )}
          </div>

          {/* Conditional Inputs */}
          {/* 1. Length */}
          {formulaType === "length" && (
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">
                Length ({unit}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                value={length}
                onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>
          )}

          {/* 2. Area (L × W) */}
          {formulaType === "area" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  Length ({unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  Width ({unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
            </div>
          )}

          {/* 3. Volume (L × W × H) */}
          {formulaType === "volume" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  Length ({unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  Width ({unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">
                  Height ({unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
            </div>
          )}

          {/* 4. Rectangular Wall Area with Opening Deductions */}
          {formulaType === "wall_area" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-stone-600 font-medium mb-1">
                    Wall Length ({unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-600 font-medium mb-1">
                    Wall Height ({unit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                  />
                </div>
              </div>

              {/* Openings (Doors & Windows) */}
              <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-stone-800">
                    Door & Window Openings to Deduct:
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOpening}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Opening</span>
                  </button>
                </div>

                {openings.map((op, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Door D1"
                      value={op.description}
                      onChange={(e) => {
                        const updated = [...openings];
                        updated[idx].description = e.target.value;
                        setOpenings(updated);
                      }}
                      className="flex-1 px-2 py-1 text-xs border border-stone-300 rounded"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder={`W (${unit})`}
                      value={op.length}
                      onChange={(e) => {
                        const updated = [...openings];
                        updated[idx].length = parseFloat(e.target.value) || 0;
                        setOpenings(updated);
                      }}
                      className="w-16 px-2 py-1 text-xs border border-stone-300 rounded font-mono"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder={`H (${unit})`}
                      value={op.height}
                      onChange={(e) => {
                        const updated = [...openings];
                        updated[idx].height = parseFloat(e.target.value) || 0;
                        setOpenings(updated);
                      }}
                      className="w-16 px-2 py-1 text-xs border border-stone-300 rounded font-mono"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={op.count || 1}
                      onChange={(e) => {
                        const updated = [...openings];
                        updated[idx].count = parseInt(e.target.value) || 1;
                        setOpenings(updated);
                      }}
                      className="w-12 px-2 py-1 text-xs border border-stone-300 rounded font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOpening(idx)}
                      className="text-stone-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Count */}
          {formulaType === "count" && (
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">
                Quantity Count ({unit}) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={countVal}
                onChange={(e) => setCountVal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>
          )}

          {/* 6. Weight */}
          {formulaType === "weight" && (
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">
                Material Weight ({unit}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={weightVal}
                onChange={(e) => setWeightVal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>
          )}

          {/* 7. Time */}
          {formulaType === "time" && (
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">
                Duration ({unit}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={timeVal}
                onChange={(e) => setTimeVal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>
          )}

          {/* 8. Lump Sum */}
          {formulaType === "lump_sum" && (
            <div>
              <label className="block text-[11px] text-stone-600 font-medium mb-1">
                Lump Sum Work Scope Description *
              </label>
              <input
                type="text"
                value={lumpSumDesc}
                onChange={(e) => setLumpSumDesc(e.target.value)}
                className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Standard quantity is fixed at 1 lump sum item (ls). The unit rate defines the full scope value.
              </p>
            </div>
          )}

          {/* Engineering: Excavation */}
          {formulaType === "excavation" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Length ({unit})</label>
                <input
                  type="number"
                  step="any"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Width ({unit})</label>
                <input
                  type="number"
                  step="any"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Depth ({unit})</label>
                <input
                  type="number"
                  step="any"
                  value={depth}
                  onChange={(e) => setDepth(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
            </div>
          )}

          {/* Engineering: Concrete */}
          {formulaType === "concrete" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Length ({unit})</label>
                <input
                  type="number"
                  step="any"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Width ({unit})</label>
                <input
                  type="number"
                  step="any"
                  value={width}
                  onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Thickness ({unit})</label>
                <input
                  type="number"
                  step="any"
                  value={thickness}
                  onChange={(e) => setThickness(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
            </div>
          )}

          {/* Engineering: Slab Concrete */}
          {formulaType === "slab_concrete" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Plan Area (sqm)</label>
                <input
                  type="number"
                  step="any"
                  value={area}
                  onChange={(e) => setArea(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 font-medium mb-1">Slab Thickness ({unit})</label>
                <input
                  type="number"
                  step="any"
                  value={thickness}
                  onChange={(e) => setThickness(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Calculation Result Banner */}
        {calcError ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {calcError}
          </div>
        ) : result ? (
          <div className="p-4 bg-[#EEF3F9] border border-[#DCE4EE] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-[#102F57] uppercase tracking-wider">
                  Approved Calculated Quantity
                </div>
                <div className="text-xl font-bold font-mono text-[#102F57] flex items-baseline gap-1 mt-0.5">
                  <span>{result.quantity}</span>
                  <span className="text-xs font-medium text-[#64748B]">{result.unit}</span>
                </div>
              </div>

              {result.standard_reference && (
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-[#102F57] border border-[#DCE4EE]">
                    {result.standard_reference}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#DCE4EE] text-xs font-mono text-[#263445]">
              <span className="font-semibold text-[#102F57]">Formula: </span>
              <span>{result.formula}</span>
            </div>
          </div>
        ) : null}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE4EE]">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-lg text-xs"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={!result}
            onClick={handleApply}
            className="btn-primary px-5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to BOQ Item</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
