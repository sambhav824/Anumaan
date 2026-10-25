import { describe, it, expect } from "vitest";
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
  calculateEstimateTotals,
  toMetres,
  toSqm,
  toCum,
} from "../src/lib/calculations";

describe("Frontend Independent Calculation Accuracy Benchmarks", () => {
  // 1. Excavation Benchmark
  it("verifies pit excavation benchmark per IS 1200 Part 1", () => {
    // 4 pits of 3.0m x 2.5m x 1.5m, 15% swell
    const pit = calculateExcavation(3.0, 2.5, 1.5, "m", 0.15);
    expect(pit.quantity).toBeCloseTo(11.25, 4);
    expect(pit.breakdown.insitu_volume_cum).toBeCloseTo(11.25, 4);
    expect(pit.breakdown.loose_volume_cum).toBeCloseTo(12.9375, 4);
    expect(pit.breakdown.insitu_volume_brass).toBeCloseTo(3.9729, 3);

    const totalInsitu = pit.breakdown.insitu_volume_cum * 4;
    const totalLoose = pit.breakdown.loose_volume_cum * 4;
    expect(totalInsitu).toBeCloseTo(45.0, 4);
    expect(totalLoose).toBeCloseTo(51.75, 4);
  });

  // 2. Concrete & Slab Benchmark
  it("verifies PCC and RCC slab concrete per IS 1200 Part 2", () => {
    // PCC: 12.0m x 2.5m x 0.10m = 3.0 m3 net, 2% wastage = 3.06 m3
    const pcc = calculateConcrete(12.0, 2.5, 0.10, "m", 2.0);
    expect(pcc.breakdown.net_volume_cum).toBeCloseTo(3.0, 4);
    expect(pcc.breakdown.gross_volume_cum).toBeCloseTo(3.06, 4);
    expect(pcc.quantity).toBeCloseTo(3.06, 4);

    // Slab: 96 sqm x 150mm (0.15m) = 14.4 m3 net, 2.5% wastage = 14.76 m3
    const slab = calculateSlabConcrete(96.0, 0.15, "sqm", "m", 2.5);
    expect(slab.breakdown.net_volume_cum).toBeCloseTo(14.4, 4);
    expect(slab.breakdown.gross_volume_cum).toBeCloseTo(14.76, 4);
    expect(slab.quantity).toBeCloseTo(14.76, 4);
  });

  // 3. Brickwork Benchmark (IS 1200 Part 3 Clause 5.2.1)
  it("verifies brickwork opening deduction threshold (<= 0.10 m2 exempt)", () => {
    // Wall: 10m x 3m x 0.23m = 6.90 m3 gross
    // Door 1.2x2.1 = 2.52 m2 -> 2.52 * 0.23 = 0.5796 m3
    // Window 1.5x1.2 = 1.80 m2 -> 1.80 * 0.23 = 0.4140 m3
    // Vent 0.25x0.25 = 0.0625 m2 -> <= 0.10 m2 EXEMPT
    // Total deduction = 0.9936 m3, Net = 5.9064 m3, 3% waste = 6.0836 m3
    const res = calculateBrickwork(
      10.0,
      3.0,
      0.23,
      [
        { length: 1.2, height: 2.1, count: 1, description: "Door D1" },
        { length: 1.5, height: 1.2, count: 1, description: "Window W1" },
        { length: 0.25, height: 0.25, count: 1, description: "Vent V1" },
      ],
      "m",
      3.0
    );
    expect(res.breakdown.gross_volume_cum).toBeCloseTo(6.9, 4);
    expect(res.breakdown.deductions_cum).toBeCloseTo(0.9936, 4);
    expect(res.breakdown.net_volume_cum).toBeCloseTo(5.9064, 4);
    expect(res.quantity).toBeCloseTo(6.0836, 4);
  });

  // 4. Plastering Benchmark (IS 1200 Part 12 Clause 7.2)
  it("verifies plastering boundary conditions per IS 1200 Part 12 Clause 7.2", () => {
    // Single Face (sides=1): 8m x 3m = 24 sqm gross
    // Vent 0.4 m2 (<=0.5) -> 0 ded
    // Door 2.1 m2 (0.5 to 3.0) -> 0 ded (Clause 7.2.2 jambs compensate)
    const singleFace = calculatePlaster(
      8.0,
      3.0,
      1,
      [
        { length: 0.5, height: 0.8, count: 1 },
        { length: 1.0, height: 2.1, count: 1 },
      ],
      "m",
      0.0
    );
    expect(singleFace.breakdown.gross_area_sqm).toBeCloseTo(24.0, 4);
    expect(singleFace.breakdown.deductions_sqm).toBeCloseTo(0.0, 4);
    expect(singleFace.quantity).toBeCloseTo(24.0, 4);

    // Both Faces (sides=2): 8m x 3m x 2 = 48 sqm gross
    // Vent 0.4 m2 -> 0 ded
    // Door 2.1 m2 -> deduct 1 face = 2.10 m2
    // Window 4.0 m2 (>3.0) -> deduct 2 faces = 8.00 m2
    // Total ded = 10.10 m2, Net = 37.90 m2, 5% waste = 39.7950 m2
    const doubleFace = calculatePlaster(
      8.0,
      3.0,
      2,
      [
        { length: 0.5, height: 0.8, count: 1 },
        { length: 1.0, height: 2.1, count: 1 },
        { length: 2.0, height: 2.0, count: 1 },
      ],
      "m",
      5.0
    );
    expect(doubleFace.breakdown.gross_area_sqm).toBeCloseTo(48.0, 4);
    expect(doubleFace.breakdown.deductions_sqm).toBeCloseTo(10.1, 4);
    expect(doubleFace.breakdown.net_area_sqm).toBeCloseTo(37.9, 4);
    expect(doubleFace.quantity).toBeCloseTo(39.795, 4);
  });

  // 5. Flooring & Painting Benchmark
  it("verifies flooring net measurement and painting surface area billing", () => {
    // Flooring: 6m x 4.5m = 27 sqm net, 5% wastage = 28.35 sqm (290.63 sqft net)
    const flr = calculateFlooring(6.0, 4.5, undefined, "m", "sqm", 5.0);
    expect(flr.breakdown.net_area_sqm).toBeCloseTo(27.0, 4);
    expect(flr.breakdown.gross_area_sqm).toBeCloseTo(28.35, 4);
    expect(flr.quantity).toBeCloseTo(28.35, 4);
    expect(flr.breakdown.net_area_sqft).toBeCloseTo(290.6256, 2);

    // Painting: 100 sqm, 2 coats @ 9 sqm/L
    // Primary billing unit per IS 1200 Part 13 is sqm (100 sqm)
    const pnt = calculatePainting(100.0, 2, 9.0, "sqm");
    expect(pnt.quantity).toBeCloseTo(100.0, 4);
    expect(pnt.unit).toBe("sqm");
    expect(pnt.breakdown.litres_required).toBeCloseTo(22.2222, 4);
  });

  // 6. Reinforcement BBS Benchmark
  it("verifies steel reinforcement BBS weight calculation", () => {
    // T12: 20 nos x 4.5m = 90m @ (144/162) = 80.00 kg
    // T16: 10 nos x 6.0m = 60m @ (256/162) = 94.81 kg
    // Net = 174.81 kg, 3% wastage = 180.06 kg
    const res = calculateReinforcement(
      [
        { diameter_mm: 12, length: 4.5, count: 20, description: "T12" },
        { diameter_mm: 16, length: 6.0, count: 10, description: "T16" },
      ],
      3.0
    );
    expect(res.breakdown.net_weight_kg).toBeCloseTo(174.81, 1);
    expect(res.quantity).toBeCloseTo(180.06, 1);
  });

  // 7. Road Layers Benchmark (MoRTH 400 & 500)
  it("verifies road pavement compacted volume vs loose truck haulage", () => {
    // 1000m x 7.5m x 150mm (0.150m) GSB, 1.25 compaction factor
    const res = calculateRoadLayers(1000.0, 7.5, 150, 1.25, "m", "mm");
    expect(res.quantity).toBeCloseTo(1125.0, 4);
    expect(res.breakdown.compacted_volume_cum).toBeCloseTo(1125.0, 4);
    expect(res.breakdown.loose_volume_cum).toBeCloseTo(1406.25, 4);
    expect(res.breakdown.compacted_volume_brass).toBeCloseTo(397.29, 2);
    expect(res.breakdown.loose_volume_brass).toBeCloseTo(496.61, 2);
  });

  // 8. Road Cross-Sections Benchmark (Average End Area)
  it("verifies average end-area volume per IRC:SP:19-2001 & MoRTH 301.8", () => {
    // A1 = 12.5 sqm, A2 = 18.5 sqm, D = 30m -> Avg = 15.5 sqm, Vol = 465 cum
    const res = calculateRoadCrossSections(12.5, 18.5, 30.0, "sqm", "m");
    expect(res.breakdown.average_area_sqm).toBeCloseTo(15.5, 4);
    expect(res.quantity).toBeCloseTo(465.0, 4);
    expect(res.breakdown.volume_brass).toBeCloseTo(164.2132, 2);
  });

  // 9. Monetary Arithmetic & GST Rates Benchmark
  it("verifies monetary totals and Indian GST rates (0%, 12%, 18%)", () => {
    const items = [
      { quantity: 50.0, unit_rate: 4500.0 },
      { quantity: 120.0, unit_rate: 850.0 },
    ];
    // Subtotal = 327,000 INR
    // OH 10% = 32,700, Cont 3% = 9,810, Disc 5% = 16,350
    // Pre-Tax Subtotal = 353,160 INR

    // 0% GST (PMAY exempt)
    const t0 = calculateEstimateTotals(items, 10.0, 3.0, 5.0, 0.0);
    expect(t0.subtotal).toBeCloseTo(327000.0, 2);
    expect(t0.overhead_amount).toBeCloseTo(32700.0, 2);
    expect(t0.contingency_amount).toBeCloseTo(9810.0, 2);
    expect(t0.discount_amount).toBeCloseTo(16350.0, 2);
    expect(t0.pre_tax_subtotal).toBeCloseTo(353160.0, 2);
    expect(t0.gst_amount).toBeCloseTo(0.0, 2);
    expect(t0.grand_total).toBeCloseTo(353160.0, 2);

    // 12% GST (Govt infrastructure)
    const t12 = calculateEstimateTotals(items, 10.0, 3.0, 5.0, 12.0);
    expect(t12.pre_tax_subtotal).toBeCloseTo(353160.0, 2);
    expect(t12.gst_amount).toBeCloseTo(42379.2, 2);
    expect(t12.grand_total).toBeCloseTo(395539.2, 2);

    // 18% GST (Commercial private)
    const t18 = calculateEstimateTotals(items, 10.0, 3.0, 5.0, 18.0);
    expect(t18.pre_tax_subtotal).toBeCloseTo(353160.0, 2);
    expect(t18.gst_amount).toBeCloseTo(63568.8, 2);
    expect(t18.grand_total).toBeCloseTo(416728.8, 2);

    // Excessive discount clamped to 0.00
    const tClamped = calculateEstimateTotals(items, 0.0, 0.0, 150.0, 18.0);
    expect(tClamped.pre_tax_subtotal).toBe(0.0);
    expect(tClamped.gst_amount).toBe(0.0);
    expect(tClamped.grand_total).toBe(0.0);
  });

  // 10. Unit Conversions Benchmark
  it("verifies exact metric-to-imperial and brass conversion constants", () => {
    expect(toMetres(1.0, "ft")).toBeCloseTo(0.3048, 6);
    expect(toMetres(12.0, "in")).toBeCloseTo(0.3048, 6);
    expect(toMetres(1000.0, "mm")).toBe(1.0);
    expect(toMetres(100.0, "cm")).toBe(1.0);

    expect(toSqm(100.0, "sqft")).toBeCloseTo(9.290304, 6);
    expect(toSqm(1.0, "brass")).toBeCloseTo(9.290304, 6);

    expect(toCum(100.0, "cuft")).toBeCloseTo(2.8316846592, 8);
    expect(toCum(1.0, "brass")).toBeCloseTo(2.8316846592, 8);
  });

  // 11. Robustness & Error Boundaries
  it("rejects zero and negative dimensions with meaningful errors", () => {
    expect(() => calculateExcavation(-5, 2, 1)).toThrow(/strictly positive/);
    expect(() => calculateConcrete(5, -2, 0.15)).toThrow(/strictly positive/);
    expect(() => calculateSlabConcrete(-50, 0.15)).toThrow(/strictly positive/);
    expect(() => calculatePainting(100, 0)).toThrow(/at least 1/);
    expect(() => calculateRoadLayers(100, 7, 0.15, 0.8)).toThrow(/less than 1\.0/);
    expect(() => calculateExcavation(5, 2, 1, "m", -0.1)).toThrow(/cannot be negative/);
  });
});
