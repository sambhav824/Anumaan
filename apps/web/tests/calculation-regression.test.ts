import { describe, it, expect } from "vitest";
import {
  calculateRoadArea,
  calculateRoadLayers,
  calculateRoadEarthwork,
  calculateRoadCrossSections,
  calculateEstimateTotals,
  formatIndianCurrency,
  toMetres,
} from "../src/lib/calculations";

describe("Calculation Regression Suite — Zero-Value & Road Takeoff Fixes", () => {
  it("Example 1: Road area calculation (100m × 5m = 500 m²)", () => {
    const res = calculateRoadArea(100, 5, "m");
    expect(res.quantity).toBe(500);
    expect(res.unit).toBe("sqm");
    expect(res.formula).toContain("500.00 sqm");
    expect(res.breakdown.area_sqm).toBe(500);
  });

  it("Example 2: Pavement layer volume (100m × 5m × 200mm = 100 m³)", () => {
    // Test with thickness entered in mm explicitly or as standard civil mm thickness
    const res = calculateRoadLayers(100, 5, 200, 1.0, "m", "mm");
    expect(res.quantity).toBe(100);
    expect(res.unit).toBe("cum");
    expect(res.breakdown.compacted_volume_cum).toBe(100);

    // Auto-conversion of 200 (>= 1.0) when unit is m
    const autoRes = calculateRoadLayers(100, 5, 200, 1.0, "m");
    expect(autoRes.quantity).toBe(100);
    expect(autoRes.unit).toBe("cum");
  });

  it("Example 3: Cost calculation (100 units @ ₹250 = ₹25,000)", () => {
    const items = [{ quantity: 100, unit_rate: 250 }];
    const totals = calculateEstimateTotals(items, 0, 0, 0, 0);
    expect(totals.subtotal).toBe(25000);
    expect(totals.taxableAmount).toBe(25000);
    expect(totals.grandTotal).toBe(25000);
    expect(formatIndianCurrency(totals.grandTotal)).toBe("₹25,000.00");
  });

  it("Example 4: Unit conversion (100m × 5m × 150mm = 75 m³)", () => {
    // 150mm thickness = 0.15m -> 100 * 5 * 0.15 = 75 cum
    const res = calculateRoadLayers(100, 5, 150, 1.0, "m", "mm");
    expect(res.quantity).toBe(75);
    expect(res.unit).toBe("cum");
    expect(res.breakdown.compacted_volume_cum).toBe(75);

    // With compaction factor 1.25 for granular subbase (GSB)
    const gsbRes = calculateRoadLayers(100, 5, 150, 1.25, "m", "mm");
    expect(gsbRes.quantity).toBe(75); // Compacted contract quantity
    expect(gsbRes.breakdown.loose_volume_cum).toBe(93.75); // Quarry dispatch volume
  });

  it("Example 5: Missing rate does not zero out valid quantities", () => {
    const validQuantity = 75.0;
    const missingRate = 0;
    const items = [{ quantity: validQuantity, unit_rate: missingRate }];
    const totals = calculateEstimateTotals(items, 0, 0, 0, 0);

    // Quantity must remain intact
    expect(items[0].quantity).toBe(75.0);
    expect(totals.subtotal).toBe(0);
    expect(formatIndianCurrency(missingRate)).toBe("₹0.00");

    // Once user provides a rate, cost computes immediately
    const updatedItems = [{ quantity: validQuantity, unit_rate: 1450 }];
    const updatedTotals = calculateEstimateTotals(updatedItems, 5, 3, 0, 18);
    expect(updatedTotals.subtotal).toBe(108750);
    expect(updatedTotals.overheadAmount).toBe(5437.5);
    expect(updatedTotals.contingencyAmount).toBe(3262.5);
    expect(updatedTotals.taxableAmount).toBe(117450);
    expect(updatedTotals.gstAmount).toBe(21141);
    expect(updatedTotals.grandTotal).toBe(138591);
    expect(formatIndianCurrency(updatedTotals.grandTotal)).toBe("₹1,38,591.00");
  });

  it("Example 6: Road earthwork excavation and embankment cut/fill", () => {
    const cutRes = calculateRoadEarthwork(100, 5, 0.5, "cut", "m");
    expect(cutRes.quantity).toBe(250);
    expect(cutRes.unit).toBe("cum");
    expect(cutRes.breakdown.cut_or_fill).toBe("cut");

    const fillRes = calculateRoadEarthwork(100, 5, 0.8, "fill", "m");
    expect(fillRes.quantity).toBe(400);
    expect(fillRes.unit).toBe("cum");
    expect(fillRes.breakdown.cut_or_fill).toBe("fill");
  });

  it("Example 7: Currency formatting robustness (never returns ₹NaN)", () => {
    expect(formatIndianCurrency(0)).toBe("₹0.00");
    expect(formatIndianCurrency(null)).toBe("₹0.00");
    expect(formatIndianCurrency(undefined)).toBe("₹0.00");
    expect(formatIndianCurrency("NaN")).toBe("₹0.00");
    expect(formatIndianCurrency(NaN)).toBe("₹0.00");
    expect(formatIndianCurrency(1697922.0)).toBe("₹16,97,922.00");
    expect(formatIndianCurrency(1850734.98)).toBe("₹18,50,734.98");
  });
});

