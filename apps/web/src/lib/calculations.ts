// Deterministic Construction Quantity & Civil Estimation Engine
// Authoritative Standards Reference:
// - IS 1200 (Part I: 1992) - Earthwork
// - IS 1200 (Part II: 1974) - Concrete Work
// - IS 1200 (Part III: 1976) - Brickwork
// - IS 1200 (Part VIII: 1993) - Steel Work & Reinforcement
// - IS 1200 (Part XI: 1977) - Paving & Floor Finishes
// - IS 1200 (Part XII: 1976) - Plastering & Pointing
// - IS 1200 (Part XIII: 1994) - Painting & White Washing
// - IS 1786:2008 (Table 1) - Deformed Steel Bars Nominal Mass
// - MoRTH Specifications for Road and Bridge Works (5th Revision)

export type ConstructionUnit =
  | "m"
  | "mm"
  | "cm"
  | "ft"
  | "in"
  | "sqm"
  | "sqft"
  | "cum"
  | "cuft"
  | "brass"
  | "kg"
  | "tonne"
  | "litre"
  | "nos";

export interface OpeningDimension {
  length?: number;
  width?: number;
  height: number;
  count?: number;
  name?: string;
  description?: string;
  deduction_pct?: number; // Custom percentage override if specified
}

export interface ReinforcementBar {
  diameter_mm: number;
  length: number; // in metres
  count?: number;
  description?: string;
}

export interface CalculationResult {
  quantity: number;
  unit: string;
  formula: string;
  breakdown: Record<string, any>;
  standard_reference?: string;
  brass_equivalent?: number;
}

// Exact Standard Unit Conversions
export const FEET_TO_METERS = 0.3048;
export const INCHES_TO_METERS = 0.0254;
export const MM_TO_METERS = 0.001;
export const CM_TO_METERS = 0.01;

export const SQFT_TO_SQM = 0.09290304; // 0.3048^2
export const SQM_TO_SQFT = 1 / SQFT_TO_SQM; // ~ 10.7639104167

export const CUFT_TO_CUM = 0.028316846592; // 0.3048^3
export const CUM_TO_CUFT = 1 / CUFT_TO_CUM; // ~ 35.3146667215

export const CUM_PER_BRASS = 2.8316846592; // 100 cu ft
export const CUFT_PER_BRASS = 100.0;
export const BRASS_AREA_TO_SQM = 9.290304; // 100 sq ft

// IS 1786:2008 Table 1 Nominal Mass per metre (kg/m)
export const IS_1786_NOMINAL_MASS_KG_M: Record<number, number> = {
  4: 0.099,
  5: 0.154,
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.580,
  20: 2.470,
  25: 3.850,
  28: 4.830,
  32: 6.310,
  36: 7.990,
  40: 9.860,
  45: 12.500,
  50: 15.420,
};

export function toMetres(val: number, unit: string = "m"): number {
  if (isNaN(val)) throw new Error("Length value must be a valid number.");
  const u = unit.toLowerCase().trim();
  if (u === "m" || u === "meter" || u === "meters" || u === "metre") return val;
  if (u === "mm" || u === "millimeter") return val * MM_TO_METERS;
  if (u === "cm" || u === "centimeter") return val * CM_TO_METERS;
  if (u === "ft" || u === "feet" || u === "foot" || u === "'") return val * FEET_TO_METERS;
  if (u === "in" || u === "inch" || u === "inches" || u === '"') return val * INCHES_TO_METERS;
  throw new Error(`Unsupported length unit: '${unit}'. Supported: m, mm, cm, ft, in.`);
}

export function toSqm(val: number, unit: string = "sqm"): number {
  if (isNaN(val)) throw new Error("Area value must be a valid number.");
  const u = unit.toLowerCase().trim();
  if (u === "sqm" || u === "m2" || u === "m²" || u === "sq_m") return val;
  if (u === "sqft" || u === "ft2" || u === "ft²" || u === "sq_ft") return val * SQFT_TO_SQM;
  if (u === "brass" || u === "brass_area") return val * BRASS_AREA_TO_SQM;
  throw new Error(`Unsupported area unit: '${unit}'. Supported: sqm, sqft, brass.`);
}

export function toCum(val: number, unit: string = "cum"): number {
  if (isNaN(val)) throw new Error("Volume value must be a valid number.");
  const u = unit.toLowerCase().trim();
  if (u === "cum" || u === "m3" || u === "m³" || u === "cu_m") return val;
  if (u === "cuft" || u === "ft3" || u === "ft³" || u === "cu_ft") return val * CUFT_TO_CUM;
  if (u === "brass" || u === "brass_volume") return val * CUM_PER_BRASS;
  throw new Error(`Unsupported volume unit: '${unit}'. Supported: cum, cuft, brass.`);
}

// 1. Excavation (IS 1200 Part I: 1992)
export function calculateExcavation(
  length: number,
  width: number,
  depth: number,
  unit: string = "m",
  swellFactor: number = 0.0 // Default 0.0, no silent swell assumption
): CalculationResult {
  const l = toMetres(length, unit);
  const w = toMetres(width, unit);
  const d = toMetres(depth, unit);

  if (l <= 0 || w <= 0 || d <= 0) {
    throw new Error("Excavation length, width, and depth must be strictly positive.");
  }
  if (swellFactor < 0) {
    throw new Error("Soil swell factor cannot be negative.");
  }

  const insituCum = l * w * d;
  const looseCum = insituCum * (1.0 + swellFactor);
  const insituBrass = insituCum / CUM_PER_BRASS;
  const looseBrass = looseCum / CUM_PER_BRASS;

  let formula = `In-situ Vol = ${l.toFixed(2)}m × ${w.toFixed(2)}m × ${d.toFixed(2)}m = ${insituCum.toFixed(2)} cum (${insituBrass.toFixed(2)} Brass)`;
  if (swellFactor > 0) {
    formula += `; Loose Vol (${(swellFactor * 100).toFixed(0)}% swell) = ${looseCum.toFixed(2)} cum (${looseBrass.toFixed(2)} Brass)`;
  }

  return {
    quantity: Number(insituCum.toFixed(4)), // Primary IS 1200 measurement
    unit: "cum",
    formula,
    standard_reference: "IS 1200 (Part 1: 1992, Clause 4.1)",
    breakdown: {
      insitu_volume_cum: Number(insituCum.toFixed(4)),
      compacted_volume_cum: Number(insituCum.toFixed(4)), // alias
      loose_volume_cum: Number(looseCum.toFixed(4)),
      insitu_volume_brass: Number(insituBrass.toFixed(4)),
      compacted_volume_brass: Number(insituBrass.toFixed(4)), // alias
      loose_volume_brass: Number(looseBrass.toFixed(4)),
      swell_factor: swellFactor,
      brass_equivalent: Number(insituBrass.toFixed(4)),
    },
    brass_equivalent: Number(insituBrass.toFixed(4)),
  };
}

// 2. Concrete Work (IS 1200 Part II: 1974)
export function calculateConcrete(
  length: number,
  width: number,
  thickness: number,
  unit: string = "m",
  wastagePct: number = 0.0 // Default 0.0, net in position per IS 1200
): CalculationResult {
  const l = toMetres(length, unit);
  const w = toMetres(width, unit);
  const t = toMetres(thickness, unit);

  if (l <= 0 || w <= 0 || t <= 0) {
    throw new Error("Concrete dimensions must be strictly positive.");
  }
  if (wastagePct < 0) {
    throw new Error("Wastage percentage cannot be negative.");
  }

  const netCum = l * w * t;
  const grossCum = netCum * (1.0 + wastagePct / 100.0);
  const netBrass = netCum / CUM_PER_BRASS;

  let formula = `Net Concrete = ${l.toFixed(2)}m × ${w.toFixed(2)}m × ${t.toFixed(2)}m = ${netCum.toFixed(2)} cum (${netBrass.toFixed(2)} Brass)`;
  if (wastagePct > 0) {
    formula += `; Gross (+${wastagePct}% wastage) = ${grossCum.toFixed(2)} cum`;
  }

  return {
    quantity: Number((wastagePct > 0 ? grossCum : netCum).toFixed(4)),
    unit: "cum",
    formula,
    standard_reference: "IS 1200 (Part 2: 1974, Clause 4.1)",
    breakdown: {
      net_volume_cum: Number(netCum.toFixed(4)),
      gross_volume_cum: Number(grossCum.toFixed(4)),
      net_volume_brass: Number(netBrass.toFixed(4)),
      wastage_pct: wastagePct,
      brass_equivalent: Number(netBrass.toFixed(4)),
    },
    brass_equivalent: Number(netBrass.toFixed(4)),
  };
}

// 3. Slab Concrete (IS 1200 Part II: 1974)
export function calculateSlabConcrete(
  area: number,
  thickness: number,
  areaUnit: string = "sqm",
  thicknessUnit: string = "m",
  wastagePct: number = 0.0
): CalculationResult {
  const a = toSqm(area, areaUnit);
  const t = toMetres(thickness, thicknessUnit);

  if (a <= 0 || t <= 0) {
    throw new Error("Slab area and thickness must be strictly positive.");
  }
  if (wastagePct < 0) {
    throw new Error("Wastage percentage cannot be negative.");
  }

  const netCum = a * t;
  const grossCum = netCum * (1.0 + wastagePct / 100.0);
  const netBrass = netCum / CUM_PER_BRASS;

  let formula = `Net Slab Concrete = ${a.toFixed(2)} sqm × ${t.toFixed(3)}m = ${netCum.toFixed(2)} cum (${netBrass.toFixed(2)} Brass)`;
  if (wastagePct > 0) {
    formula += `; Gross (+${wastagePct}% wastage) = ${grossCum.toFixed(2)} cum`;
  }

  return {
    quantity: Number((wastagePct > 0 ? grossCum : netCum).toFixed(4)),
    unit: "cum",
    formula,
    standard_reference: "IS 1200 (Part 2: 1974, Clause 4.1)",
    breakdown: {
      area_sqm: Number(a.toFixed(4)),
      thickness_m: Number(t.toFixed(4)),
      net_volume_cum: Number(netCum.toFixed(4)),
      gross_volume_cum: Number(grossCum.toFixed(4)),
      net_volume_brass: Number(netBrass.toFixed(4)),
      wastage_pct: wastagePct,
      brass_equivalent: Number(netBrass.toFixed(4)),
    },
    brass_equivalent: Number(netBrass.toFixed(4)),
  };
}

// 4. Brickwork (IS 1200 Part III: 1976)
export function calculateBrickwork(
  length: number,
  height: number,
  thickness: number,
  openings: OpeningDimension[] = [],
  unit: string = "m",
  wastagePct: number = 0.0,
  ignoreSmallOpenings: boolean = true
): CalculationResult {
  const l = toMetres(length, unit);
  const h = toMetres(height, unit);
  const t = toMetres(thickness, unit);

  if (l <= 0 || h <= 0 || t <= 0) {
    throw new Error("Brickwork wall dimensions must be strictly positive.");
  }
  if (wastagePct < 0) {
    throw new Error("Wastage percentage cannot be negative.");
  }

  const grossCum = l * h * t;
  let totalDeductionsCum = 0;
  const breakdownOpenings: string[] = [];

  for (const op of openings) {
    const opL = toMetres(op.length ?? op.width ?? 0, unit);
    const opH = toMetres(op.height, unit);
    const count = op.count || 1;
    const opFaceArea = opL * opH;

    // IS 1200 Part III Clause 5.2.1: Openings each up to 0.1 m2 exempt from deduction
    if (ignoreSmallOpenings && opFaceArea <= 0.10) {
      breakdownOpenings.push(`${op.description || "Opening"}: ${opFaceArea.toFixed(3)} sqm ≤ 0.10 sqm (Exempt from deduction)`);
      continue;
    }

    const opVol = opFaceArea * t * count;
    totalDeductionsCum += opVol;
    breakdownOpenings.push(`${op.description || "Opening"}: ${count}x (${opL.toFixed(2)}×${opH.toFixed(2)}m) = ${opVol.toFixed(3)} cum deducted`);
  }

  if (totalDeductionsCum > grossCum) {
    throw new Error("Total opening deductions cannot exceed wall gross volume.");
  }

  const netCum = grossCum - totalDeductionsCum;
  const finalCum = netCum * (1.0 + wastagePct / 100.0);
  const netBrass = netCum / CUM_PER_BRASS;

  let formula = `Gross (${grossCum.toFixed(2)} cum) - Deductions (${totalDeductionsCum.toFixed(2)} cum) = ${netCum.toFixed(2)} cum net`;
  if (wastagePct > 0) {
    formula += ` + ${wastagePct}% wastage = ${finalCum.toFixed(2)} cum`;
  }

  return {
    quantity: Number((wastagePct > 0 ? finalCum : netCum).toFixed(4)),
    unit: "cum",
    formula,
    standard_reference: "IS 1200 (Part 3: 1976, Clause 5.2.1)",
    breakdown: {
      gross_volume_cum: Number(grossCum.toFixed(4)),
      deductions_cum: Number(totalDeductionsCum.toFixed(4)),
      net_volume_cum: Number(netCum.toFixed(4)),
      gross_volume_with_waste: Number(finalCum.toFixed(4)),
      net_volume_brass: Number(netBrass.toFixed(4)),
      openings_breakdown: breakdownOpenings,
      wastage_pct: wastagePct,
      brass_equivalent: Number(netBrass.toFixed(4)),
    },
    brass_equivalent: Number(netBrass.toFixed(4)),
  };
}

// 5. Plastering (IS 1200 Part XII: 1976)
export function calculatePlaster(
  length: number,
  height: number,
  sides: number = 1,
  openings: OpeningDimension[] = [],
  unit: string = "m",
  wastagePct: number = 0.0
): CalculationResult {
  const l = toMetres(length, unit);
  const h = toMetres(height, unit);

  if (l <= 0 || h <= 0) {
    throw new Error("Plaster wall dimensions must be strictly positive.");
  }
  if (sides !== 1 && sides !== 2) {
    throw new Error("Plaster sides must be 1 (single face) or 2 (both faces).");
  }
  if (wastagePct < 0) {
    throw new Error("Wastage percentage cannot be negative.");
  }

  const grossAreaSqm = l * h * sides;
  let totalDeductionSqm = 0;
  const breakdownOpenings: string[] = [];

  for (const op of openings) {
    const opL = toMetres(op.length ?? op.width ?? 0, unit);
    const opH = toMetres(op.height, unit);
    const count = op.count || 1;
    const singleOpArea = opL * opH;
    const totalOpArea = singleOpArea * count;

    let ded = 0;
    let ruleDesc = "";

    if (op.deduction_pct !== undefined) {
      ded = totalOpArea * (op.deduction_pct / 100.0) * sides;
      ruleDesc = `Custom ${op.deduction_pct}% override`;
    } else {
      // Automated IS 1200 Part XII Clause 7.2 Rules
      if (singleOpArea <= 0.5) {
        // Clause 7.2.1: No deduction for opening <= 0.5 sqm
        ded = 0;
        ruleDesc = "Area ≤ 0.5 sqm: No deduction (IS 1200 7.2.1)";
      } else if (singleOpArea <= 3.0) {
        // Clause 7.2.2:
        if (sides === 2) {
          // Deduct for 1 face only (1.0 x opening area)
          ded = totalOpArea * 1.0;
          ruleDesc = "0.5 to 3.0 sqm on 2 faces: Deduct 1 face only (IS 1200 7.2.2)";
        } else {
          // Only 1 face plastered: No deduction
          ded = 0;
          ruleDesc = "0.5 to 3.0 sqm on 1 face: No deduction (IS 1200 7.2.2)";
        }
      } else {
        // Clause 7.2.3: Exceeding 3.0 sqm: deduct for both faces (or the plastered face)
        ded = totalOpArea * sides;
        ruleDesc = `> 3.0 sqm: Full deduction on ${sides} face(s) (IS 1200 7.2.3)`;
      }
    }

    totalDeductionSqm += ded;
    breakdownOpenings.push(`${op.description || "Opening"}: ${count}x (${opL.toFixed(2)}×${opH.toFixed(2)}m = ${singleOpArea.toFixed(2)} sqm) -> ${ruleDesc} = ${ded.toFixed(2)} sqm deducted`);
  }

  if (totalDeductionSqm > grossAreaSqm) {
    throw new Error("Total opening deductions cannot exceed plaster gross area.");
  }

  const netAreaSqm = grossAreaSqm - totalDeductionSqm;
  const finalAreaSqm = netAreaSqm * (1.0 + wastagePct / 100.0);

  let formula = `Gross (${grossAreaSqm.toFixed(2)} sqm on ${sides} side${sides>1?'s':''}) - Deductions (${totalDeductionSqm.toFixed(2)} sqm) = ${netAreaSqm.toFixed(2)} sqm net`;
  if (wastagePct > 0) {
    formula += ` + ${wastagePct}% wastage = ${finalAreaSqm.toFixed(2)} sqm`;
  }

  return {
    quantity: Number((wastagePct > 0 ? finalAreaSqm : netAreaSqm).toFixed(4)),
    unit: "sqm",
    formula,
    standard_reference: "IS 1200 (Part 12: 1976, Clause 7.2)",
    breakdown: {
      gross_area_sqm: Number(grossAreaSqm.toFixed(4)),
      deductions_sqm: Number(totalDeductionSqm.toFixed(4)),
      net_area_sqm: Number(netAreaSqm.toFixed(4)),
      final_area_sqm: Number(finalAreaSqm.toFixed(4)),
      net_area_sqft: Number((netAreaSqm * SQM_TO_SQFT).toFixed(2)),
      wastage_pct: wastagePct,
      openings_breakdown: breakdownOpenings,
    },
  };
}

// 6. Flooring (IS 1200 Part XI: 1977)
export function calculateFlooring(
  length?: number,
  width?: number,
  area?: number,
  unit: string = "m",
  areaUnit: string = "sqm",
  wastagePct: number = 0.0 // Default 0.0, net between walls
): CalculationResult {
  let netSqm = 0;
  if (area !== undefined && area > 0) {
    netSqm = toSqm(area, areaUnit);
  } else if (length && width) {
    const l = toMetres(length, unit);
    const w = toMetres(width, unit);
    if (l <= 0 || w <= 0) {
      throw new Error("Flooring length and width must be strictly positive.");
    }
    netSqm = l * w;
  } else {
    throw new Error("Either area or both length and width must be provided.");
  }

  if (netSqm <= 0) {
    throw new Error("Flooring net area must be strictly positive.");
  }
  if (wastagePct < 0) {
    throw new Error("Wastage percentage cannot be negative.");
  }

  const grossSqm = netSqm * (1.0 + wastagePct / 100.0);
  const grossSqft = grossSqm * SQM_TO_SQFT;

  let formula = `Net Flooring Area = ${netSqm.toFixed(2)} sqm (${(netSqm * SQM_TO_SQFT).toFixed(1)} sq ft)`;
  if (wastagePct > 0) {
    formula += ` + ${wastagePct}% wastage = ${grossSqm.toFixed(2)} sqm (${grossSqft.toFixed(1)} sq ft)`;
  }

  return {
    quantity: Number((wastagePct > 0 ? grossSqm : netSqm).toFixed(4)),
    unit: "sqm",
    formula,
    standard_reference: "IS 1200 (Part 11: 1977, Clause 4.1)",
    breakdown: {
      net_area_sqm: Number(netSqm.toFixed(4)),
      gross_area_sqm: Number(grossSqm.toFixed(4)),
      net_area_sqft: Number((netSqm * SQM_TO_SQFT).toFixed(2)),
      gross_area_sqft: Number(grossSqft.toFixed(2)),
      wastage_pct: wastagePct,
    },
  };
}

// 7. Painting (IS 1200 Part XIII: 1994)
export function calculatePainting(
  area: number,
  coats: number = 2,
  coveragePerUnit: number = 10.0, // Manufacturer coverage (sqm per litre)
  areaUnit: string = "sqm"
): CalculationResult {
  const a = toSqm(area, areaUnit);
  if (a <= 0) {
    throw new Error("Painting surface area must be strictly positive.");
  }
  if (coats < 1) {
    throw new Error("Number of coats must be at least 1.");
  }
  if (coveragePerUnit <= 0) {
    throw new Error("Paint coverage per unit must be strictly positive.");
  }

  const totalCoatArea = a * coats;
  const litres = totalCoatArea / coveragePerUnit;

  const formula = `Surface Area = ${a.toFixed(2)} sqm; for ${coats} coats @ ${coveragePerUnit.toFixed(1)} sqm/L = ${litres.toFixed(2)} Litres required`;

  return {
    quantity: Number(a.toFixed(4)), // Primary IS 1200 BOQ billing quantity is surface area in sqm
    unit: "sqm",
    formula,
    standard_reference: "IS 1200 (Part 13: 1994, Clause 4.1)",
    breakdown: {
      paintable_area_sqm: Number(a.toFixed(4)),
      paintable_area_sqft: Number((a * SQM_TO_SQFT).toFixed(2)),
      coats,
      coverage_per_unit: coveragePerUnit,
      litres_required: Number(litres.toFixed(4)),
      liters_required: Number(litres.toFixed(4)),
    },
  };
}

// 8. Reinforcement BBS (IS 1786:2008 & SP 34:1987)
export function calculateReinforcement(
  bars: ReinforcementBar[],
  wastagePct: number = 0.0,
  useNominalIS1786: boolean = false
): CalculationResult {
  if (!bars || bars.length === 0) {
    throw new Error("Bar details list cannot be empty for reinforcement calculation.");
  }
  if (wastagePct < 0) {
    throw new Error("Wastage percentage cannot be negative.");
  }

  let totalNetKg = 0;
  const barDetails: Array<{ diameter_mm: number; unit_weight: number; length: number; count: number; weight_kg: number }> = [];

  for (const bar of bars) {
    const d = bar.diameter_mm;
    const count = bar.count || 1;
    if (d <= 0 || bar.length <= 0 || count <= 0) {
      throw new Error("Bar diameter, length, and count must be strictly positive.");
    }

    let unitWeight: number;
    let method: string;
    if (useNominalIS1786 && IS_1786_NOMINAL_MASS_KG_M[d]) {
      unitWeight = IS_1786_NOMINAL_MASS_KG_M[d];
      method = "IS 1786 Table 1";
    } else {
      // d^2 / 162
      unitWeight = (d * d) / 162.0;
      method = "d²/162";
    }

    const totalBarLen = bar.length * count;
    const barWeight = totalBarLen * unitWeight;
    totalNetKg += barWeight;

    barDetails.push({
      diameter_mm: d,
      unit_weight: Number(unitWeight.toFixed(4)),
      length: bar.length,
      count,
      weight_kg: Number(barWeight.toFixed(2)),
    });
  }

  const grossKg = totalNetKg * (1.0 + wastagePct / 100.0);
  const tonnes = grossKg / 1000.0;

  let formula = `Net Steel = ${totalNetKg.toFixed(2)} kg (${(totalNetKg / 1000).toFixed(4)} MT)`;
  if (wastagePct > 0) {
    formula += ` + ${wastagePct}% wastage = ${grossKg.toFixed(2)} kg (${tonnes.toFixed(4)} MT)`;
  }

  return {
    quantity: Number((wastagePct > 0 ? grossKg : totalNetKg).toFixed(2)),
    unit: "kg",
    formula,
    standard_reference: "IS 1786:2008 & SP 34:1987",
    breakdown: {
      net_weight_kg: Number(totalNetKg.toFixed(2)),
      gross_weight_kg: Number(grossKg.toFixed(2)),
      net_weight_tonne: Number((totalNetKg / 1000.0).toFixed(4)),
      gross_weight_tonne: Number(tonnes.toFixed(4)),
      tonnes: Number(tonnes.toFixed(4)),
      wastage_pct: wastagePct,
      bars: barDetails,
    },
  };
}

// 9. Road Layers (MoRTH 5th Revision)
export function calculateRoadLayers(
  length: number,
  width: number,
  compactedThickness: number,
  compactionFactor: number = 1.0, // Default 1.0
  unit: string = "m",
  thicknessUnit?: string
): CalculationResult {
  const tUnit = thicknessUnit || unit;
  const l = toMetres(length, unit);
  const w = toMetres(width, unit);
  const t = toMetres(compactedThickness, tUnit);

  if (l <= 0 || w <= 0 || t <= 0) {
    throw new Error("Road layer length, width, and thickness must be strictly positive.");
  }
  if (compactionFactor < 1.0) {
    throw new Error("Compaction factor cannot be less than 1.0.");
  }

  const compactedCum = l * w * t;
  const looseCum = compactedCum * compactionFactor;
  const compactedBrass = compactedCum / CUM_PER_BRASS;
  const looseBrass = looseCum / CUM_PER_BRASS;

  let formula = `Compacted Layer = ${l.toFixed(2)}m × ${w.toFixed(2)}m × ${t.toFixed(3)}m = ${compactedCum.toFixed(2)} cum (${compactedBrass.toFixed(2)} Brass)`;
  if (compactionFactor > 1.0) {
    formula += `; Loose Material (${compactionFactor.toFixed(2)}x factor) = ${looseCum.toFixed(2)} cum (${looseBrass.toFixed(2)} Brass)`;
  }

  return {
    quantity: Number(compactedCum.toFixed(4)), // Primary MoRTH payment quantity
    unit: "cum",
    formula,
    standard_reference: "MoRTH (5th Revision, Clauses 401.8, 406.8)",
    breakdown: {
      compacted_volume_cum: Number(compactedCum.toFixed(4)),
      loose_volume_cum: Number(looseCum.toFixed(4)),
      compacted_volume_brass: Number(compactedBrass.toFixed(4)),
      loose_volume_brass: Number(looseBrass.toFixed(4)),
      compaction_factor: compactionFactor,
      brass_equivalent: Number(compactedBrass.toFixed(4)),
    },
    brass_equivalent: Number(compactedBrass.toFixed(4)),
  };
}

// 10. Road Cross-Sections (Average End Area)
export function calculateRoadCrossSections(
  area1: number,
  area2: number,
  distance: number,
  areaUnit: string = "sqm",
  distanceUnit: string = "m"
): CalculationResult {
  const a1 = toSqm(area1, areaUnit);
  const a2 = toSqm(area2, areaUnit);
  const d = toMetres(distance, distanceUnit);

  if (a1 < 0 || a2 < 0 || d <= 0) {
    throw new Error("Cross-section areas must be non-negative and distance must be strictly positive.");
  }
  if (a1 === 0 && a2 === 0) {
    throw new Error("Both cross-section areas cannot be zero simultaneously.");
  }

  const avgArea = (a1 + a2) / 2.0;
  const volumeCum = avgArea * d;
  const brass = volumeCum / CUM_PER_BRASS;

  const formula = `Avg End Area [(${a1.toFixed(2)} + ${a2.toFixed(2)}) / 2 = ${avgArea.toFixed(2)} sqm] × Distance (${d.toFixed(2)}m) = ${volumeCum.toFixed(2)} cum (${brass.toFixed(2)} Brass)`;

  return {
    quantity: Number(volumeCum.toFixed(4)),
    unit: "cum",
    formula,
    standard_reference: "IRC:SP:19-2001 & MoRTH Section 301.8",
    breakdown: {
      average_area_sqm: Number(avgArea.toFixed(4)),
      area1_sqm: Number(a1.toFixed(4)),
      area2_sqm: Number(a2.toFixed(4)),
      distance_m: Number(d.toFixed(4)),
      volume_cum: Number(volumeCum.toFixed(4)),
      volume_brass: Number(brass.toFixed(4)),
      brass_equivalent: Number(brass.toFixed(4)),
    },
    brass_equivalent: Number(brass.toFixed(4)),
  };
}

// 10b. Boundary Wall Civil Calculations (IS 1200)
export function calculateBoundaryWall(
  lengthM: number,
  heightM: number,
  thicknessMm = 230,
  masonryType = "clay_brick",
  gateWidthM = 0,
  gateHeightM = 0,
  foundationDepthM = 0.8
): CalculationResult {
  if (lengthM <= 0 || heightM <= 0 || thicknessMm <= 0) {
    throw new Error("Wall length, height, and thickness must be strictly positive.");
  }

  const L = lengthM;
  const H = heightM;
  const T = thicknessMm / 1000.0;
  const grossArea = L * H;
  const gateArea = (gateWidthM || 0) * (gateHeightM || 0);
  const netArea = Math.max(0, grossArea - gateArea);
  const masonryVol = Math.round(netArea * T * 10000) / 10000;

  // Bricks count (approx 525 per cum with mortar and wastage)
  const bricksCount = Math.round(masonryVol * 525);
  // Excavation
  const excavationVol = Math.round(L * (T + 0.3) * foundationDepthM * 10000) / 10000;
  // PCC 1:4:8
  const pccVol = Math.round(L * (T + 0.2) * 0.15 * 10000) / 10000;
  // Plaster both sides + top
  const plasterArea = Math.round(((netArea * 2) + (L * T)) * 100) / 100;

  const formula = `Net Area (${netArea.toFixed(2)} sqm) × Thickness (${T.toFixed(3)}m) = ${masonryVol.toFixed(2)} cum [Bricks: ~${bricksCount} nos, Exc: ${excavationVol.toFixed(2)} cum, PCC: ${pccVol.toFixed(2)} cum, Plaster: ${plasterArea.toFixed(2)} sqm]`;

  return {
    quantity: masonryVol,
    unit: "cum",
    formula,
    standard_reference: "IS 1200 Part III (Brickwork) & Part I (Earthwork)",
    breakdown: {
      net_area_sqm: netArea,
      masonry_volume_cum: masonryVol,
      bricks_count: bricksCount,
      excavation_cum: excavationVol,
      pcc_cum: pccVol,
      plaster_sqm: plasterArea,
    },
  };
}

// 10c. Quick Building Estimation Engine (CPWD / PWD Building Indices)
export function calculateQuickEstimate(
  builtUpAreaSqft: number,
  floors = 1,
  qualityTier = "standard",
  regionId = "national_cpwd"
) {
  if (builtUpAreaSqft <= 0) {
    throw new Error("Built-up area must be strictly positive.");
  }
  const totalArea = builtUpAreaSqft * Math.max(1, floors);
  const ratesMatrix: Record<string, Record<string, number>> = {
    maharashtra_pwd: { economy: 1550, standard: 2100, luxury: 2950 },
    karnataka_pwd: { economy: 1500, standard: 2050, luxury: 2900 },
    national_cpwd: { economy: 1450, standard: 1950, luxury: 2800 },
  };
  const reg = ratesMatrix[regionId] || ratesMatrix["national_cpwd"];
  const costPerSqft = reg[qualityTier] || reg["standard"];
  const totalCost = Math.round(totalArea * costPerSqft);

  // Materials
  const cementBags = Math.round(totalArea * (qualityTier === "economy" ? 0.40 : qualityTier === "luxury" ? 0.52 : 0.45));
  const steelKg = Math.round(totalArea * (qualityTier === "economy" ? 3.2 : qualityTier === "luxury" ? 4.8 : 3.8));
  const sandCuft = Math.round(totalArea * (qualityTier === "economy" ? 1.5 : qualityTier === "luxury" ? 2.0 : 1.75));
  const aggCuft = Math.round(totalArea * (qualityTier === "economy" ? 1.2 : qualityTier === "luxury" ? 1.6 : 1.4));
  const bricksCount = Math.round(totalArea * (qualityTier === "economy" ? 16 : qualityTier === "luxury" ? 22 : 19));

  return {
    totalAreaSqft: totalArea,
    costPerSqft,
    totalCost,
    cementBags,
    steelTonnes: Math.round((steelKg / 1000) * 100) / 100,
    steelKg,
    sandBrass: Math.round((sandCuft / 100) * 100) / 100,
    aggBrass: Math.round((aggCuft / 100) * 100) / 100,
    bricksCount,
  };
}

// 11. Exact Monetary Arithmetic & Totals (No Silent Tax Assumptions)
export interface EstimateTotals {
  subtotal: number;
  overheadAmount: number;
  contingencyAmount: number;
  discountAmount: number;
  preTaxSubtotal: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  // Aliases for backend API parity
  overhead_amount: number;
  contingency_amount: number;
  discount_amount: number;
  pre_tax_subtotal: number;
  taxable_amount: number;
  gst_amount: number;
  grand_total: number;
  total_amount: number;
}

export function calculateEstimateTotals(
  items: Array<{ quantity: number; unit_rate: number }>,
  overheadPct: number = 0,
  contingencyPct: number = 0,
  discountPct: number = 0,
  gstPct: number = 0 // Explicit default 0.0 (NO universal tax assumption)
): EstimateTotals {
  let subtotal = 0;
  for (const it of items) {
    const qty = Number(it.quantity) || 0;
    const rate = Number(it.unit_rate) || 0;
    if (qty < 0 || rate < 0) {
      throw new Error("Item quantity and rate cannot be negative.");
    }
    subtotal += Math.round(qty * rate * 100) / 100;
  }
  subtotal = Math.round(subtotal * 100) / 100;

  const ohPct = Math.max(0, Number(overheadPct) || 0);
  const contPct = Math.max(0, Number(contingencyPct) || 0);
  const discPct = Math.max(0, Number(discountPct) || 0);
  const taxPct = Math.max(0, Number(gstPct) || 0);

  const overheadAmount = Math.round(subtotal * (ohPct / 100.0) * 100) / 100;
  const contingencyAmount = Math.round(subtotal * (contPct / 100.0) * 100) / 100;
  const discountAmount = Math.round(subtotal * (discPct / 100.0) * 100) / 100;

  // Pre-tax taxable total
  let taxableAmount = Math.round((subtotal + overheadAmount + contingencyAmount - discountAmount) * 100) / 100;
  if (taxableAmount < 0) taxableAmount = 0;

  const gstAmount = Math.round(taxableAmount * (taxPct / 100.0) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + gstAmount) * 100) / 100;

  return {
    subtotal,
    overheadAmount,
    contingencyAmount,
    discountAmount,
    preTaxSubtotal: taxableAmount,
    taxableAmount,
    gstAmount,
    grandTotal,
    overhead_amount: overheadAmount,
    contingency_amount: contingencyAmount,
    discount_amount: discountAmount,
    pre_tax_subtotal: taxableAmount,
    taxable_amount: taxableAmount,
    gst_amount: gstAmount,
    grand_total: grandTotal,
    total_amount: grandTotal,
  };
}

export function formatIndianCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "₹0.00";
  const cleaned = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]/g, "")) : amount;
  const num = typeof cleaned === "number" && !isNaN(cleaned) && isFinite(cleaned) ? cleaned : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
}

export const formatCurrencyINR = formatIndianCurrency;

// 12. Measurement-Based Calculation Helpers
export function calculateLength(length: number, unit: string = "m"): CalculationResult {
  if (isNaN(length) || length <= 0) {
    throw new Error("Length must be strictly positive.");
  }
  const u = unit.toLowerCase().trim();
  const normUnit = u === "m" || u === "meter" || u === "metre" ? "m" : u === "ft" || u === "feet" ? "ft" : u;
  return {
    quantity: Number(length.toFixed(4)),
    unit: normUnit,
    formula: `Length = ${length.toFixed(2)} ${normUnit}`,
    standard_reference: "Direct Linear Measurement",
    breakdown: { length, unit: normUnit },
  };
}

export function calculateArea(length: number, width: number, unit: string = "m"): CalculationResult {
  if (isNaN(length) || length <= 0 || isNaN(width) || width <= 0) {
    throw new Error("Length and width must be strictly positive.");
  }
  const u = unit.toLowerCase().trim();
  const area = length * width;
  const areaUnit = u === "m" || u === "meter" || u === "metre" || u === "sqm" ? "sqm" : "sqft";
  const dimUnit = areaUnit === "sqm" ? "m" : "ft";
  return {
    quantity: Number(area.toFixed(4)),
    unit: areaUnit,
    formula: `Area = ${length.toFixed(2)}${dimUnit} × ${width.toFixed(2)}${dimUnit} = ${area.toFixed(2)} ${areaUnit}`,
    standard_reference: "Direct Area Measurement (L × W)",
    breakdown: { length, width, area: Number(area.toFixed(4)), unit: areaUnit },
  };
}

export function calculateVolume(length: number, width: number, height: number, unit: string = "m"): CalculationResult {
  if (isNaN(length) || length <= 0 || isNaN(width) || width <= 0 || isNaN(height) || height <= 0) {
    throw new Error("Length, width, and height must be strictly positive.");
  }
  const u = unit.toLowerCase().trim();
  const vol = length * width * height;
  const volUnit = u === "m" || u === "meter" || u === "metre" || u === "cum" ? "cum" : "cuft";
  const dimUnit = volUnit === "cum" ? "m" : "ft";
  return {
    quantity: Number(vol.toFixed(4)),
    unit: volUnit,
    formula: `Volume = ${length.toFixed(2)}${dimUnit} × ${width.toFixed(2)}${dimUnit} × ${height.toFixed(2)}${dimUnit} = ${vol.toFixed(2)} ${volUnit}`,
    standard_reference: "Direct Volume Measurement (L × W × H)",
    breakdown: { length, width, height, volume: Number(vol.toFixed(4)), unit: volUnit },
  };
}

export function calculateWallArea(
  length: number,
  height: number,
  openings: OpeningDimension[] = [],
  unit: string = "m"
): CalculationResult {
  if (isNaN(length) || length <= 0 || isNaN(height) || height <= 0) {
    throw new Error("Wall length and height must be strictly positive.");
  }
  const u = unit.toLowerCase().trim();
  const areaUnit = u === "m" || u === "meter" || u === "metre" || u === "sqm" ? "sqm" : "sqft";
  const dimUnit = areaUnit === "sqm" ? "m" : "ft";

  const grossArea = length * height;
  let totalDeductions = 0;
  const breakdownOpenings: string[] = [];

  for (const op of openings) {
    const opL = Number(op.width ?? op.length) || 0;
    const opH = Number(op.height) || 0;
    const count = Number(op.count) || 1;
    if (opL <= 0 || opH <= 0 || count <= 0) continue;

    const opArea = opL * opH * count;
    totalDeductions += opArea;
    const opName = op.name || op.description || "Opening";
    breakdownOpenings.push(`${opName}: ${count}x (${opL.toFixed(2)}×${opH.toFixed(2)}${dimUnit} = ${opArea.toFixed(2)} ${areaUnit})`);
  }

  if (totalDeductions > grossArea) {
    throw new Error("Total opening deductions cannot exceed wall gross area.");
  }

  const netArea = grossArea - totalDeductions;
  return {
    quantity: Number(netArea.toFixed(4)),
    unit: areaUnit,
    formula: `Gross Wall (${length.toFixed(2)}${dimUnit} × ${height.toFixed(2)}${dimUnit} = ${grossArea.toFixed(2)} ${areaUnit}) - Openings (${totalDeductions.toFixed(2)} ${areaUnit}) = ${netArea.toFixed(2)} ${areaUnit} net`,
    standard_reference: "Net Wall Area = Gross Area - Openings Deductions",
    breakdown: {
      gross_area: Number(grossArea.toFixed(4)),
      deductions: Number(totalDeductions.toFixed(4)),
      net_area: Number(netArea.toFixed(4)),
      openings_breakdown: breakdownOpenings,
    },
  };
}

export function calculateCount(count: number, unit: string = "nos"): CalculationResult {
  if (isNaN(count) || count <= 0) {
    throw new Error("Count must be strictly positive.");
  }
  return {
    quantity: Number(count.toFixed(2)),
    unit,
    formula: `Count = ${count} ${unit}`,
    standard_reference: "Unit / Piece Count",
    breakdown: { count, unit },
  };
}

export function calculateWeight(weight: number, unit: string = "kg"): CalculationResult {
  if (isNaN(weight) || weight <= 0) {
    throw new Error("Weight must be strictly positive.");
  }
  return {
    quantity: Number(weight.toFixed(2)),
    unit,
    formula: `Weight = ${weight} ${unit}`,
    standard_reference: "Weight Measurement",
    breakdown: { weight, unit },
  };
}

export function calculateTime(duration: number, unit: string = "day"): CalculationResult {
  if (isNaN(duration) || duration <= 0) {
    throw new Error("Duration must be strictly positive.");
  }
  return {
    quantity: Number(duration.toFixed(2)),
    unit,
    formula: `Time = ${duration} ${unit}`,
    standard_reference: "Time / Work Duration",
    breakdown: { duration, unit },
  };
}

export function calculateLumpSum(description?: string): CalculationResult {
  const desc = description || "Lump sum specified work";
  return {
    quantity: 1,
    unit: "ls",
    formula: `Lump Sum: ${desc}`,
    standard_reference: "Fixed Lump Sum (Scope Defined)",
    breakdown: { description: desc },
  };
}


