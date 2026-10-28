import { describe, it, expect } from "vitest";
import {
  calculateEstimateTotals,
  formatIndianCurrency,
} from "../src/lib/calculations";

describe("Production Financial Accuracy & Contractor Calculation Engine", () => {
  // 1. Standard Estimate Calculation
  it("calculates standard estimate correctly with multiple items", () => {
    const items = [
      { quantity: 100, unit_rate: 350 },  // 35,000.00
      { quantity: 25.5, unit_rate: 4200 }, // 107,100.00
      { quantity: 1200, unit_rate: 68 },   // 81,600.00
    ];
    // Subtotal: 35000 + 107100 + 81600 = 223,700.00
    const res = calculateEstimateTotals(items, 0, 0, 0, 0);
    expect(res.subtotal).toBe(223700.0);
    expect(res.taxableAmount).toBe(223700.0);
    expect(res.gstAmount).toBe(0.0);
    expect(res.grandTotal).toBe(223700.0);
  });

  // 2. Overhead and Contingency Application
  it("applies overhead and contingency as independent percentages of base subtotal", () => {
    const items = [{ quantity: 100, unit_rate: 1000 }]; // Subtotal: 100,000.00
    // Overhead 8% = 8,000.00
    // Contingency 4% = 4,000.00
    const res = calculateEstimateTotals(items, 8.0, 4.0, 0, 0);
    expect(res.subtotal).toBe(100000.0);
    expect(res.overheadAmount).toBe(8000.0);
    expect(res.contingencyAmount).toBe(4000.0);
    expect(res.taxableAmount).toBe(112000.0);
    expect(res.grandTotal).toBe(112000.0);
  });

  // 3. Discount Application
  it("applies client discount cleanly without double-counting", () => {
    const items = [{ quantity: 100, unit_rate: 1000 }]; // Subtotal: 100,000.00
    // Overhead 5% (5,000), Contingency 3% (3,000), Discount 2% (2,000)
    // Taxable = 100000 + 5000 + 3000 - 2000 = 106,000.00
    const res = calculateEstimateTotals(items, 5.0, 3.0, 2.0, 0);
    expect(res.discountAmount).toBe(2000.0);
    expect(res.taxableAmount).toBe(106000.0);
    expect(res.grandTotal).toBe(106000.0);
  });

  // 4. Configurable Tax Calculation (0%, 5%, 12%, 18%, 28%, and custom decimal rates)
  it("applies taxes strictly to pre-tax taxable amount and supports various statutory rates", () => {
    const items = [{ quantity: 50, unit_rate: 2000 }]; // Subtotal: 100,000.00
    // Taxable = 100,000 (0% OH, 0% Cont, 0% Disc)

    // 0% rate (Exempt / Nil)
    const res0 = calculateEstimateTotals(items, 0, 0, 0, 0);
    expect(res0.gstAmount).toBe(0.0);
    expect(res0.grandTotal).toBe(100000.0);

    // 5% rate
    const res5 = calculateEstimateTotals(items, 0, 0, 0, 5.0);
    expect(res5.gstAmount).toBe(5000.0);
    expect(res5.grandTotal).toBe(105000.0);

    // 12% rate
    const res12 = calculateEstimateTotals(items, 0, 0, 0, 12.0);
    expect(res12.gstAmount).toBe(12000.0);
    expect(res12.grandTotal).toBe(112000.0);

    // 18% rate
    const res18 = calculateEstimateTotals(items, 0, 0, 0, 18.0);
    expect(res18.gstAmount).toBe(18000.0);
    expect(res18.grandTotal).toBe(118000.0);

    // 28% rate
    const res28 = calculateEstimateTotals(items, 0, 0, 0, 28.0);
    expect(res28.gstAmount).toBe(28000.0);
    expect(res28.grandTotal).toBe(128000.0);

    // Custom decimal rate (e.g., 7.5%)
    const resCustom = calculateEstimateTotals(items, 0, 0, 0, 7.5);
    expect(resCustom.gstAmount).toBe(7500.0);
    expect(resCustom.grandTotal).toBe(107500.0);
  });

  // 5. Zero and Empty Values Handling
  it("safely handles empty item arrays and zero inputs without NaN or division by zero", () => {
    const emptyRes = calculateEstimateTotals([], 0, 0, 0, 0);
    expect(emptyRes.subtotal).toBe(0.0);
    expect(emptyRes.overheadAmount).toBe(0.0);
    expect(emptyRes.contingencyAmount).toBe(0.0);
    expect(emptyRes.discountAmount).toBe(0.0);
    expect(emptyRes.taxableAmount).toBe(0.0);
    expect(emptyRes.gstAmount).toBe(0.0);
    expect(emptyRes.grandTotal).toBe(0.0);

    const zeroItems = [
      { quantity: 0, unit_rate: 500 },
      { quantity: 10, unit_rate: 0 },
    ];
    const zeroRes = calculateEstimateTotals(zeroItems, 10, 5, 2, 18);
    expect(zeroRes.subtotal).toBe(0.0);
    expect(zeroRes.grandTotal).toBe(0.0);
  });

  // 6. Decimal Precision and Rounding
  it("rounds all intermediate and grand monetary values to exact 2 decimal places", () => {
    const items = [
      { quantity: 3.3333, unit_rate: 100.33 }, // 334.43
      { quantity: 7.7777, unit_rate: 45.67 },  // 355.21
    ];
    const res = calculateEstimateTotals(items, 5.5, 2.25, 1.75, 18.0);
    // Verify all returned amounts have at most 2 decimal digits
    for (const val of [
      res.subtotal,
      res.overheadAmount,
      res.contingencyAmount,
      res.discountAmount,
      res.taxableAmount,
      res.gstAmount,
      res.grandTotal,
    ]) {
      const parts = val.toString().split(".");
      if (parts.length > 1) {
        expect(parts[1].length).toBeLessThanOrEqual(2);
      }
    }
  });

  // 7. Invalid Input Rejection
  it("rejects negative quantity or rate with explicit validation error", () => {
    expect(() =>
      calculateEstimateTotals([{ quantity: -10, unit_rate: 100 }])
    ).toThrow(/cannot be negative/);

    expect(() =>
      calculateEstimateTotals([{ quantity: 10, unit_rate: -50 }])
    ).toThrow(/cannot be negative/);
  });

  // 8. Large Totals (Multi-Crore Project Scale)
  it("handles multi-crore infrastructure values without overflow", () => {
    const items = [
      { quantity: 50000, unit_rate: 18500 },  // ₹92,50,00,000 (92.5 Crore)
      { quantity: 200000, unit_rate: 4200 },  // ₹84,00,00,000 (84 Crore)
    ];
    // Subtotal: 176,50,00,000 (176.5 Crore)
    const res = calculateEstimateTotals(items, 5, 2, 1, 18);
    expect(res.subtotal).toBe(1765000000);
    expect(res.overheadAmount).toBe(88250000);
    expect(res.contingencyAmount).toBe(35300000);
    expect(res.discountAmount).toBe(17650000);
    expect(res.taxableAmount).toBe(1870900000);
    expect(res.gstAmount).toBe(336762000);
    expect(res.grandTotal).toBe(2207662000);

    const formatted = formatIndianCurrency(res.grandTotal);
    expect(formatted).toContain("2,20,76,62,000.00");
  });

  // 9. Consistency between camelCase and snake_case properties
  it("maintains strict parity between camelCase and snake_case aliases for API contract", () => {
    const items = [{ quantity: 10, unit_rate: 500 }];
    const res = calculateEstimateTotals(items, 5, 3, 2, 18);
    expect(res.overheadAmount).toBe(res.overhead_amount);
    expect(res.contingencyAmount).toBe(res.contingency_amount);
    expect(res.discountAmount).toBe(res.discount_amount);
    expect(res.taxableAmount).toBe(res.taxable_amount);
    expect(res.gstAmount).toBe(res.gst_amount);
    expect(res.grandTotal).toBe(res.grand_total);
    expect(res.grandTotal).toBe(res.total_amount);
  });
});
