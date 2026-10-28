// ==============================================================================
// Product: अनुमान (Anumaan) — Construction Drawing Measurement & Takeoff Engine
// Standards: IS 1200 Measurement of Building and Civil Engineering Works
// Formula Reference: Gauss's Area Formula (Shoelace Algorithm) & Euclidean Metrology
// ==============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export type TakeoffMeasurementType = "length" | "area" | "count";

export type MeasurementUnit = "m" | "ft" | "mm" | "in" | "sqm" | "sqft" | "cum" | "cuft" | "nos" | "brass";

export interface ScaleCalibration {
  point1: Point2D;
  point2: Point2D;
  knownDistance: number;
  unit: "m" | "ft" | "mm" | "in";
  pixelDistance: number;
  scaleRatio: number; // Real units per pixel
  pageNumber: number;
  isCalibrated: boolean;
}

export interface TakeoffMeasurement {
  id: string;
  name: string;
  pageNumber: number;
  type: TakeoffMeasurementType;
  points: Point2D[];
  rawPixelValue: number; // Pixels for length, square pixels for area, count for items
  quantity: number; // Converted real-world quantity
  unit: MeasurementUnit;
  color?: string;
  countCategory?: string;
  notes?: string;
  isConfirmed?: boolean;
  constructionMapping?: {
    itemCategory: "flooring" | "slab_concrete" | "wall_plaster" | "brickwork" | "excavation" | "item_count";
    heightOrDepthM?: number;
    thicknessM?: number;
    wastagePct?: number;
    unitRate?: number;
    derivedQuantity?: number;
    derivedUnit?: string;
    derivedAmount?: number;
    formula?: string;
  };
}

/**
 * Calculates Euclidean distance between two 2D points on the canvas in pixels.
 */
export function calculatePixelDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calibrates scale from two points and a known real-world distance.
 * Returns scale ratio in (real units per pixel).
 */
export function calibrateDrawingScale(
  p1: Point2D,
  p2: Point2D,
  knownDistance: number,
  unit: "m" | "ft" | "mm" | "in",
  pageNumber: number = 1
): ScaleCalibration {
  if (knownDistance <= 0) {
    throw new Error("Known distance for scale calibration must be strictly positive.");
  }
  const pixelDistance = calculatePixelDistance(p1, p2);
  if (pixelDistance < 2.0) {
    throw new Error("Calibration points are too close together. Pick two distinct reference points on the drawing.");
  }

  const scaleRatio = knownDistance / pixelDistance;

  return {
    point1: p1,
    point2: p2,
    knownDistance,
    unit,
    pixelDistance: Math.round(pixelDistance * 100) / 100,
    scaleRatio: Number(scaleRatio.toFixed(8)),
    pageNumber,
    isCalibrated: true,
  };
}

/**
 * Calculates real-world length from two canvas points using calibrated scale ratio.
 */
export function calculateRealLength(
  p1: Point2D,
  p2: Point2D,
  scale: ScaleCalibration
): { length: number; pixelDistance: number; unit: MeasurementUnit } {
  if (!scale.isCalibrated || scale.scaleRatio <= 0) {
    throw new Error("Drawing scale has not been calibrated. Calibrate the scale before measuring.");
  }

  const pixelDist = calculatePixelDistance(p1, p2);
  const realLength = Math.round(pixelDist * scale.scaleRatio * 1000) / 1000;

  return {
    length: realLength,
    pixelDistance: Math.round(pixelDist * 100) / 100,
    unit: scale.unit,
  };
}

/**
 * Calculates polygon area on canvas using the Shoelace Formula (Gauss's Area Algorithm).
 * Area = 0.5 * |Σ(x_i * y_{i+1} - x_{i+1} * y_i)|
 */
export function calculatePolygonPixelArea(points: Point2D[]): number {
  if (!points || points.length < 3) {
    return 0;
  }

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2.0;
}

/**
 * Calculates real-world polygon area from canvas vertices using calibrated scale ratio.
 * Real Area = Pixel Area * (Scale Ratio)^2
 */
export function calculateRealArea(
  points: Point2D[],
  scale: ScaleCalibration
): { area: number; pixelArea: number; unit: MeasurementUnit } {
  if (!scale.isCalibrated || scale.scaleRatio <= 0) {
    throw new Error("Drawing scale has not been calibrated. Calibrate the scale before measuring.");
  }

  const pixelArea = calculatePolygonPixelArea(points);
  const areaRatio = scale.scaleRatio * scale.scaleRatio;
  const realArea = Math.round(pixelArea * areaRatio * 1000) / 1000;

  const unit: MeasurementUnit = scale.unit === "ft" ? "sqft" : "sqm";

  return {
    area: realArea,
    pixelArea: Math.round(pixelArea * 100) / 100,
    unit,
  };
}

/**
 * Converts length units (m, ft, mm, in).
 */
export function convertLength(val: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return val;

  // Convert to metres first
  let metres = val;
  if (fromUnit === "mm") metres = val / 1000;
  else if (fromUnit === "cm") metres = val / 100;
  else if (fromUnit === "ft") metres = val * 0.3048;
  else if (fromUnit === "in") metres = val * 0.0254;

  // Convert from metres to target
  if (toUnit === "m") return Math.round(metres * 10000) / 10000;
  if (toUnit === "mm") return Math.round(metres * 1000 * 10) / 10;
  if (toUnit === "ft") return Math.round((metres / 0.3048) * 1000) / 1000;
  if (toUnit === "in") return Math.round((metres / 0.0254) * 100) / 100;

  return metres;
}

/**
 * Converts area units (sqm, sqft, brass).
 * 1 brass = 100 sq ft (for 1 layer) or 100 cu ft
 */
export function convertArea(val: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return val;

  let sqm = val;
  if (fromUnit === "sqft") sqm = val * 0.092903;

  if (toUnit === "sqm") return Math.round(sqm * 1000) / 1000;
  if (toUnit === "sqft") return Math.round((sqm / 0.092903) * 1000) / 1000;

  return sqm;
}

/**
 * Bridges verified drawing measurements into Civil Quantity & BOQ Estimation formulas.
 */
export function deriveConstructionQuantities(
  measurement: TakeoffMeasurement,
  mapping: {
    itemCategory: "flooring" | "slab_concrete" | "wall_plaster" | "brickwork" | "excavation" | "item_count";
    heightOrDepthM?: number;
    thicknessM?: number;
    wastagePct?: number;
    unitRate?: number;
  }
) {
  const wastage = 1.0 + (mapping.wastagePct || 0) / 100.0;
  const rate = Number(mapping.unitRate) || 0;

  switch (mapping.itemCategory) {
    case "flooring": {
      // Area in sqm or sqft
      const areaVal = measurement.quantity;
      const finalQty = Math.round(areaVal * wastage * 100) / 100;
      const unit = measurement.unit === "sqft" ? "sqft" : "sqm";
      const amount = Math.round(finalQty * rate * 100) / 100;
      const formula = `Takeoff Area (${areaVal} ${unit}) × Wastage (${(wastage * 100 - 100).toFixed(0)}%) = ${finalQty} ${unit}`;
      return {
        description: `Vitrified / Ceramic Floor Tile Finish (Measured from Plan)`,
        quantity: finalQty,
        unit,
        unitRate: rate,
        amount,
        formula,
        category: "material",
      };
    }

    case "slab_concrete": {
      // Slab Area * Thickness in metres
      let areaSqm = measurement.unit === "sqft" ? measurement.quantity * 0.092903 : measurement.quantity;
      const thickness = mapping.thicknessM || 0.15; // default 150mm
      const volumeCum = Math.round(areaSqm * thickness * wastage * 1000) / 1000;
      const amount = Math.round(volumeCum * rate * 100) / 100;
      const formula = `Plan Area (${areaSqm.toFixed(2)} sqm) × Thickness (${thickness}m) × Wastage = ${volumeCum} cum`;
      return {
        description: `Reinforced Cement Concrete (RCC M20/M25) Slab Pour (Measured from Plan)`,
        quantity: volumeCum,
        unit: "cum",
        unitRate: rate,
        amount,
        formula,
        category: "material",
      };
    }

    case "wall_plaster": {
      // Wall Length * Height in metres
      let lengthM = measurement.unit === "ft" ? measurement.quantity * 0.3048 : measurement.quantity;
      const height = mapping.heightOrDepthM || 3.0; // default 3.0m ceiling
      const plasterAreaSqm = Math.round(lengthM * height * 2 * wastage * 100) / 100; // both faces
      const amount = Math.round(plasterAreaSqm * rate * 100) / 100;
      const formula = `Wall Length (${lengthM.toFixed(2)}m) × Height (${height}m) × 2 Faces = ${plasterAreaSqm} sqm`;
      return {
        description: `Internal & External Cement Plastering 1:4 (Measured Wall Perimeter)`,
        quantity: plasterAreaSqm,
        unit: "sqm",
        unitRate: rate,
        amount,
        formula,
        category: "material",
      };
    }

    case "brickwork": {
      // Wall Length * Height * Thickness
      let lengthM = measurement.unit === "ft" ? measurement.quantity * 0.3048 : measurement.quantity;
      const height = mapping.heightOrDepthM || 3.0;
      const thickness = mapping.thicknessM || 0.23; // default 230mm (9-inch brickwork)
      const volumeCum = Math.round(lengthM * height * thickness * wastage * 1000) / 1000;
      const brickCount = Math.round(volumeCum * 525);
      const amount = Math.round(volumeCum * rate * 100) / 100;
      const formula = `Length (${lengthM.toFixed(2)}m) × Height (${height}m) × Thick (${thickness}m) = ${volumeCum} cum (~${brickCount} bricks)`;
      return {
        description: `Red Clay Brickwork 230mm in CM 1:6 (Measured from Wall Run)`,
        quantity: volumeCum,
        unit: "cum",
        unitRate: rate,
        amount,
        formula,
        category: "material",
      };
    }

    case "excavation": {
      // Footprint Area * Depth
      let areaSqm = measurement.unit === "sqft" ? measurement.quantity * 0.092903 : measurement.quantity;
      const depth = mapping.heightOrDepthM || 1.5;
      const volumeCum = Math.round(areaSqm * depth * wastage * 1000) / 1000;
      const amount = Math.round(volumeCum * rate * 100) / 100;
      const formula = `Footprint Area (${areaSqm.toFixed(2)} sqm) × Depth (${depth}m) = ${volumeCum} cum`;
      return {
        description: `Foundation & Basement Earthwork Excavation (Measured from Plan)`,
        quantity: volumeCum,
        unit: "cum",
        unitRate: rate,
        amount,
        formula,
        category: "composite",
      };
    }

    case "item_count":
    default: {
      const count = Math.round(measurement.quantity);
      const amount = Math.round(count * rate * 100) / 100;
      const formula = `Counted Units: ${count} nos`;
      return {
        description: `${measurement.name || "Structural Elements"} (Takeoff Count)`,
        quantity: count,
        unit: "nos",
        unitRate: rate,
        amount,
        formula,
        category: "composite",
      };
    }
  }
}

