import { describe, it, expect } from "vitest";
import {
  calibrateDrawingScale,
  calculateRealLength,
  calculatePolygonPixelArea,
  calculateRealArea,
  convertLength,
  convertArea,
  deriveConstructionQuantities,
  TakeoffMeasurement,
} from "../src/lib/takeoffCalculations";

describe("Construction Drawing Takeoff Engine — Calibration & Geometry", () => {
  it("calibrates drawing scale from 2 reference points and known distance", () => {
    // 200 pixels represents 10.0 metres
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 100 };
    const scale = calibrateDrawingScale(p1, p2, 10.0, "m");

    expect(scale.isCalibrated).toBe(true);
    expect(scale.pixelDistance).toBe(200);
    expect(scale.scaleRatio).toBe(0.05); // 10m / 200px = 0.05 m/px
    expect(scale.unit).toBe("m");
  });

  it("rejects non-positive known distances and coincident calibration points", () => {
    const p1 = { x: 50, y: 50 };
    const p2 = { x: 250, y: 50 };

    expect(() => calibrateDrawingScale(p1, p2, 0, "m")).toThrow(
      "Known distance for scale calibration must be strictly positive."
    );
    expect(() => calibrateDrawingScale(p1, p2, -5, "m")).toThrow(
      "Known distance for scale calibration must be strictly positive."
    );
    expect(() => calibrateDrawingScale(p1, { x: 50.5, y: 50.5 }, 5, "m")).toThrow(
      "Calibration points are too close together"
    );
  });

  it("calculates real-world length from line points using calibrated scale", () => {
    const scale = calibrateDrawingScale({ x: 0, y: 0 }, { x: 100, y: 0 }, 5.0, "m"); // 0.05 m/px

    // 60 pixels horizontal line = 3.0 metres
    const { length, unit } = calculateRealLength({ x: 10, y: 20 }, { x: 70, y: 20 }, scale);
    expect(length).toBe(3.0);
    expect(unit).toBe("m");

    // 3-4-5 right triangle: 30px dx, 40px dy = 50px hypotenuse = 2.5 metres
    const diag = calculateRealLength({ x: 0, y: 0 }, { x: 30, y: 40 }, scale);
    expect(diag.length).toBe(2.5);
  });

  it("calculates polygon area using the Shoelace Formula correctly", () => {
    // 100px x 50px rectangle: area = 5,000 square pixels
    const rect = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ];
    const pixelArea = calculatePolygonPixelArea(rect);
    expect(pixelArea).toBe(5000);

    // Scale: 100px = 10m (0.1 m/px). 1 sq px = 0.01 sqm. 5000 sq px = 50.0 sqm
    const scale = calibrateDrawingScale({ x: 0, y: 0 }, { x: 100, y: 0 }, 10.0, "m");
    const { area, unit } = calculateRealArea(rect, scale);
    expect(area).toBe(50.0);
    expect(unit).toBe("sqm");
  });

  it("warns and throws if measurement is attempted before scale calibration", () => {
    const uncalibrated = {
      point1: { x: 0, y: 0 },
      point2: { x: 0, y: 0 },
      knownDistance: 0,
      unit: "m" as const,
      pixelDistance: 0,
      scaleRatio: 0,
      pageNumber: 1,
      isCalibrated: false,
    };

    expect(() => calculateRealLength({ x: 0, y: 0 }, { x: 10, y: 10 }, uncalibrated)).toThrow(
      "Drawing scale has not been calibrated"
    );
    expect(() =>
      calculateRealArea(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
        uncalibrated
      )
    ).toThrow("Drawing scale has not been calibrated");
  });

  it("handles unit conversions consistently (m, ft, mm, sqm, sqft)", () => {
    expect(convertLength(1.0, "m", "mm")).toBe(1000);
    expect(convertLength(3.28084, "ft", "m")).toBe(1.0);
    expect(convertArea(100, "sqft", "sqm")).toBe(9.29);
    expect(convertArea(10, "sqm", "sqft")).toBe(107.639);
  });

  it("derives accurate civil quantities for Add to Estimate workflow", () => {
    // 1. Flooring
    const floorTakeoff: TakeoffMeasurement = {
      id: "m1",
      name: "Living Room Floor",
      pageNumber: 1,
      type: "area",
      points: [],
      rawPixelValue: 2000,
      quantity: 50.0,
      unit: "sqm",
    };
    const floorResult = deriveConstructionQuantities(floorTakeoff, {
      itemCategory: "flooring",
      wastagePct: 5.0,
      unitRate: 950.0,
    });
    expect(floorResult.quantity).toBe(52.5); // 50 * 1.05
    expect(floorResult.unit).toBe("sqm");
    expect(floorResult.amount).toBe(49875.0); // 52.5 * 950

    // 2. Concrete Slab (50 sqm x 0.15m thick)
    const slabResult = deriveConstructionQuantities(floorTakeoff, {
      itemCategory: "slab_concrete",
      thicknessM: 0.15,
      wastagePct: 2.0,
      unitRate: 6850.0,
    });
    expect(slabResult.quantity).toBe(7.65); // 50 * 0.15 * 1.02
    expect(slabResult.unit).toBe("cum");
    expect(slabResult.amount).toBe(52402.5);

    // 3. Wall Brickwork (10m wall x 3m height x 0.23m thick)
    const wallTakeoff: TakeoffMeasurement = {
      id: "m2",
      name: "North Boundary Wall",
      pageNumber: 1,
      type: "length",
      points: [],
      rawPixelValue: 100,
      quantity: 10.0,
      unit: "m",
    };
    const brickResult = deriveConstructionQuantities(wallTakeoff, {
      itemCategory: "brickwork",
      heightOrDepthM: 3.0,
      thicknessM: 0.23,
      unitRate: 5200.0,
    });
    expect(brickResult.quantity).toBe(6.9); // 10 * 3 * 0.23 = 6.9 cum
    expect(brickResult.unit).toBe("cum");
    expect(brickResult.amount).toBe(35880.0);

    // 4. Item Count (Columns)
    const countTakeoff: TakeoffMeasurement = {
      id: "m3",
      name: "RCC Columns C1 (300x450mm)",
      pageNumber: 1,
      type: "count",
      points: [],
      rawPixelValue: 12,
      quantity: 12,
      unit: "nos",
    };
    const countResult = deriveConstructionQuantities(countTakeoff, {
      itemCategory: "item_count",
      unitRate: 4200.0,
    });
    expect(countResult.quantity).toBe(12);
    expect(countResult.amount).toBe(50400.0);
  });
});

