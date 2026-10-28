import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nProvider } from "../src/context/I18nContext";
import { formatIndianCurrency, calculateQuickEstimate } from "../src/lib/calculations";

describe("Project-First Workspace & Milestone Billing Calculations", () => {
  it("calculates quick civil estimate accurately from dimensions", () => {
    // 1200 sq.ft standard quality
    const res = calculateQuickEstimate(1200, 1, "standard", "maharashtra_pwd");
    expect(res.totalAreaSqft).toBe(1200);
    expect(res.costPerSqft).toBe(2100);
    expect(res.totalCost).toBe(1200 * 2100); // ₹25,20,000
    expect(res.cementBags).toBe(540); // 1200 * 0.45
    expect(res.steelTonnes).toBe(4.56); // 1200 * 3.8 / 1000
  });

  it("calculates multi-floor building area and costs consistently", () => {
    const res = calculateQuickEstimate(1500, 3, "luxury", "national_cpwd");
    expect(res.totalAreaSqft).toBe(4500); // 1500 * 3
    expect(res.costPerSqft).toBe(2800);
    expect(res.totalCost).toBe(4500 * 2800); // ₹1,26,00,000 (1.26 Crore)
    expect(formatIndianCurrency(res.totalCost)).toBe("₹1,26,00,000.00");
  });

  it("calculates milestone percentage schedule totaling 100% of project value", () => {
    const totalContract = 2500000; // 25 Lakhs
    const standardStages = [
      { name: "Advance", pct: 15 },
      { name: "Plinth Level", pct: 25 },
      { name: "Slab Casting", pct: 30 },
      { name: "Masonry & Plaster", pct: 20 },
      { name: "Handover", pct: 10 },
    ];

    const totalPct = standardStages.reduce((sum, s) => sum + s.pct, 0);
    expect(totalPct).toBe(100);

    const amounts = standardStages.map((s) => Math.round(totalContract * (s.pct / 100)));
    const totalAmt = amounts.reduce((sum, a) => sum + a, 0);
    expect(totalAmt).toBe(totalContract);

    expect(amounts[0]).toBe(375000); // 15%
    expect(amounts[1]).toBe(625000); // 25%
    expect(amounts[2]).toBe(750000); // 30%
    expect(amounts[3]).toBe(500000); // 20%
    expect(amounts[4]).toBe(250000); // 10%
  });

  it("formats currency strings cleanly and prevents NaN across all numeric boundaries", () => {
    expect(formatIndianCurrency(0)).toBe("₹0.00");
    expect(formatIndianCurrency(null)).toBe("₹0.00");
    expect(formatIndianCurrency(undefined)).toBe("₹0.00");
    expect(formatIndianCurrency("NaN")).toBe("₹0.00");
    expect(formatIndianCurrency(1697922.0)).toBe("₹16,97,922.00");
    expect(formatIndianCurrency(1850734.98)).toBe("₹18,50,734.98");
  });
});

