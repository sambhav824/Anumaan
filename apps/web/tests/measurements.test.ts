import { describe, it, expect } from "vitest";
import {
  calculateLength,
  calculateArea,
  calculateVolume,
  calculateWallArea,
  calculateCount,
  calculateWeight,
  calculateTime,
  calculateLumpSum,
  calculateEstimateTotals,
} from "../src/lib/calculations";

describe("Measurement-Based Quotations & Calculations Engine", () => {
  // 1. Length Calculations
  it("calculates length correctly in metres and feet", () => {
    const resM = calculateLength(12.5, "m");
    expect(resM.quantity).toBe(12.5);
    expect(resM.unit).toBe("m");
    expect(resM.formula).toContain("12.50 m");

    const resFt = calculateLength(40, "ft");
    expect(resFt.quantity).toBe(40);
    expect(resFt.unit).toBe("ft");
  });

  // 2. Area Calculations (Length × Width)
  it("calculates area from length and width", () => {
    // 10m x 8.5m = 85.0 sqm
    const res = calculateArea(10, 8.5, "m");
    expect(res.quantity).toBe(85.0);
    expect(res.unit).toBe("sqm");
    expect(res.formula).toContain("10.00m × 8.50m = 85.00 sqm");

    // In feet: 20ft x 15ft = 300.0 sqft
    const resFt = calculateArea(20, 15, "ft");
    expect(resFt.quantity).toBe(300.0);
    expect(resFt.unit).toBe("sqft");
  });

  // 3. Volume Calculations (Length × Width × Height)
  it("calculates volume from 3 dimensions", () => {
    // 5m x 4m x 0.6m = 12.0 cum
    const res = calculateVolume(5, 4, 0.6, "m");
    expect(res.quantity).toBe(12.0);
    expect(res.unit).toBe("cum");
    expect(res.formula).toContain("5.00m × 4.00m × 0.60m = 12.00 cum");

    // In feet: 10ft x 10ft x 2ft = 200.0 cuft
    const resFt = calculateVolume(10, 10, 2, "ft");
    expect(resFt.quantity).toBe(200.0);
    expect(resFt.unit).toBe("cuft");
  });

  // 4. Rectangular Wall Area with Opening Deductions
  it("calculates net wall area after deducting door and window openings", () => {
    // Wall: 10m length x 3m height = 30.0 sqm gross
    // Door: 1m x 2.1m = 2.1 sqm (count: 1)
    // Window: 1.2m x 1.5m = 1.8 sqm (count: 2) -> 3.6 sqm
    // Total deductions: 2.1 + 3.6 = 5.7 sqm
    // Net Wall Area: 30.0 - 5.7 = 24.3 sqm
    const openings = [
      { name: "Main Door", width: 1.0, height: 2.1, count: 1 },
      { name: "Windows W1", width: 1.2, height: 1.5, count: 2 },
    ];
    const res = calculateWallArea(10, 3, openings, "m");
    expect(res.quantity).toBe(24.3);
    expect(res.unit).toBe("sqm");
    expect(res.formula).toContain("Gross Wall");
    expect(res.formula).toContain("Openings");
    expect(res.formula).toContain("24.30 sqm net");
  });

  // 5. Quantity × Unit-Rate Calculation
  it("calculates exact line amount = quantity × unit rate", () => {
    // e.g. 120 ft² of brickwork @ ₹85/ft² = ₹10,200.00
    const qty = 120;
    const rate = 85;
    const lineAmount = qty * rate;
    expect(lineAmount).toBe(10200.0);

    const totals = calculateEstimateTotals(
      [{ quantity: qty, unit_rate: rate }],
      0,
      0,
      0,
      0
    );
    expect(totals.subtotal).toBe(10200.0);
    expect(totals.grandTotal).toBe(10200.0);
  });

  // 6. Count, Weight, Time, Lump Sum
  it("supports count, weight, time, and lump sum measurements", () => {
    const countRes = calculateCount(50, "piece");
    expect(countRes.quantity).toBe(50);
    expect(countRes.unit).toBe("piece");

    const wtRes = calculateWeight(125.75, "kg");
    expect(wtRes.quantity).toBe(125.75);
    expect(wtRes.unit).toBe("kg");

    const tRes = calculateTime(8, "day");
    expect(tRes.quantity).toBe(8);
    expect(tRes.unit).toBe("day");

    const lsRes = calculateLumpSum("Site clearance and preliminary work");
    expect(lsRes.quantity).toBe(1);
    expect(lsRes.unit).toBe("ls");
  });

  // 7. Validation of Missing, Negative, or Invalid Dimensions
  it("rejects non-positive dimensions and invalid openings", () => {
    expect(() => calculateLength(-5, "m")).toThrow(/strictly positive/);
    expect(() => calculateArea(0, 10, "m")).toThrow(/strictly positive/);
    expect(() => calculateVolume(5, -2, 3, "m")).toThrow(/strictly positive/);
    expect(() => calculateWallArea(-10, 3, [], "m")).toThrow(/strictly positive/);

    // Deduction greater than gross area
    const excessiveOpenings = [
      { name: "Giant Wall Void", width: 10, height: 10, count: 1 },
    ];
    expect(() => calculateWallArea(5, 3, excessiveOpenings, "m")).toThrow(/cannot exceed/);
  });

  // 8. Decimal Quantities and Rounding
  it("correctly quantizes decimal dimensions without floating point anomalies", () => {
    // 3.333m x 2.455m = 8.182515 sqm -> rounded cleanly
    const res = calculateArea(3.333, 2.455, "m");
    expect(res.quantity).toBe(8.1825);
    expect(Number(res.quantity.toFixed(2))).toBe(8.18);
  });
});
