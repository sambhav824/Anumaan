import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "../src/context/I18nContext";
import { BOQTable } from "../src/components/BOQTable";
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
  CUM_PER_BRASS,
} from "../src/lib/calculations";
import { BOQItem } from "../src/lib/api";

describe("Deterministic Construction Quantity & Civil Estimation Engine", () => {
  it("calculates excavation with soil swell and brass equivalent", () => {
    // 10m x 5m x 2m = 100 cum
    const res = calculateExcavation(10, 5, 2, "m", 0.20);
    expect(res.quantity).toBe(100);
    expect(res.unit).toBe("cum");
    expect(res.breakdown.loose_volume_cum).toBe(120);
    expect(res.brass_equivalent).toBeCloseTo(100 / CUM_PER_BRASS, 2);
  });

  it("calculates concrete with configurable wastage", () => {
    // 10m x 4m x 0.15m = 6 cum. +2% wastage = 6.12 cum
    const res = calculateConcrete(10, 4, 0.15, "m", 2.0);
    expect(res.quantity).toBe(6.12);
    expect(res.unit).toBe("cum");
    expect(res.breakdown.net_volume_cum).toBe(6.0);
  });

  it("calculates slab concrete from area and thickness", () => {
    // 100 sqm x 0.125m = 12.5 cum. +2% wastage = 12.75 cum
    const res = calculateSlabConcrete(100, 0.125, "sqm", "m", 2.0);
    expect(res.quantity).toBe(12.75);
    expect(res.unit).toBe("cum");
  });

  it("calculates brickwork with openings deduction", () => {
    // Wall: 10m x 3m x 0.23m = 6.90 cum
    // 2 Doors: 1.2m x 2.1m x 0.23m x 2 = 1.1592 cum
    // Net = 6.90 - 1.1592 = 5.7408 cum
    const openings = [{ length: 1.2, height: 2.1, count: 2 }];
    const res = calculateBrickwork(10, 3, 0.23, openings, "m", 0.0);
    expect(res.quantity).toBeCloseTo(5.7408, 4);
    expect(res.breakdown.deductions_cum).toBeCloseTo(1.1592, 4);
  });

  it("calculates plaster with automated IS 1200 deductions", () => {
    // Under IS 1200 Part XII Clause 7.2:
    // Opening 1: 0.4 sqm (<= 0.5 sqm) -> 0 deduction
    // Opening 2: 2.0 sqm (0.5 to 3.0 sqm) -> When 1 face plastered: no deduction (jambs/sills compensate); When 2 faces: deduct 1 face (2.0 sqm)
    // Opening 3: 4.0 sqm (> 3.0 sqm) -> Deduct full area on all plastered faces (4.0 sqm on 1 face, 8.0 sqm on 2 faces)
    const openings = [
      { length: 0.8, height: 0.5, count: 1 }, // 0.4 sqm
      { length: 1.0, height: 2.0, count: 1 }, // 2.0 sqm
      { length: 2.0, height: 2.0, count: 1 }, // 4.0 sqm
    ];

    // Single face plaster (sides = 1): 30 sqm gross - 4.0 sqm deduction = 26.0 sqm net
    const resSingle = calculatePlaster(10, 3, 1, openings, "m", 0.0);
    expect(resSingle.breakdown.deductions_sqm).toBe(4.0);
    expect(resSingle.breakdown.net_area_sqm).toBe(26.0);
    expect(resSingle.quantity).toBe(26.0);

    // Two faces plaster (sides = 2): 60 sqm gross - (2.0 + 8.0) = 50.0 sqm net
    const resDouble = calculatePlaster(10, 3, 2, openings, "m", 0.0);
    expect(resDouble.breakdown.deductions_sqm).toBe(10.0);
    expect(resDouble.breakdown.net_area_sqm).toBe(50.0);
    expect(resDouble.quantity).toBe(50.0);
  });

  it("calculates flooring with wastage", () => {
    // 10m x 8m = 80 sqm. +5% wastage = 84.0 sqm
    const res = calculateFlooring(10, 8, undefined, "m", "sqm", 5.0);
    expect(res.breakdown.net_area_sqm).toBe(80.0);
    expect(res.quantity).toBe(84.0);
  });

  it("calculates painting required in litres", () => {
    // Per IS 1200 Part XIII: Primary BOQ quantity is surface area in sqm
    // 100 sqm x 2 coats / 10 sqm/L = 20 litres material required
    const res = calculatePainting(100, 2, 10.0, "sqm");
    expect(res.quantity).toBe(100.0);
    expect(res.unit).toBe("sqm");
    expect(res.breakdown.litres_required).toBe(20.0);
  });

  it("calculates reinforcement steel using BBS formula d^2 / 162", () => {
    // 12mm bar unit weight: 144 / 162 = 0.8888 kg/m
    // Length: 10m, Count: 10 => 88.888 kg
    // +5% wastage => 93.33 kg
    const bars = [{ diameter_mm: 12, length: 10, count: 10 }];
    const res = calculateReinforcement(bars, 5.0);
    expect(res.breakdown.net_weight_kg).toBeCloseTo(88.89, 1);
    expect(res.quantity).toBeCloseTo(93.33, 1);
    expect(res.unit).toBe("kg");
  });

  it("calculates road layers compacted and loose volumes", () => {
    // 100m x 7m x 0.15m = 105 cum compacted
    // Loose = 105 x 1.25 = 131.25 cum
    const res = calculateRoadLayers(100, 7, 0.15, 1.25, "m");
    expect(res.quantity).toBe(105.0);
    expect(res.breakdown.loose_volume_cum).toBe(131.25);
  });

  it("calculates road cross-section volume via Average End Area formula", () => {
    // A1 = 20 sqm, A2 = 30 sqm, L = 50m
    // Volume = (20 + 30) / 2 * 50 = 1250 cum
    const res = calculateRoadCrossSections(20, 30, 50, "sqm", "m");
    expect(res.quantity).toBe(1250.0);
    expect(res.unit).toBe("cum");
  });

  it("calculates precise estimate monetary totals with overhead, contingency, discount, and GST", () => {
    const items = [
      { quantity: 100, unit_rate: 250 }, // 25,000
      { quantity: 500, unit_rate: 70 },  // 35,000
    ];
    // Subtotal: 60,000
    // Overhead 5%: 3,000
    // Contingency 3%: 1,800
    // Discount 2%: 1,200
    // Taxable: 60000 + 3000 + 1800 - 1200 = 63,600
    // GST 18%: 11,448
    // Grand Total: 75,048
    const totals = calculateEstimateTotals(items, 5, 3, 2, 18);
    expect(totals.subtotal).toBe(60000);
    expect(totals.overheadAmount).toBe(3000);
    expect(totals.contingencyAmount).toBe(1800);
    expect(totals.discountAmount).toBe(1200);
    expect(totals.taxableAmount).toBe(63600);
    expect(totals.gstAmount).toBe(11448);
    expect(totals.grandTotal).toBe(75048);
  });
});

describe("BOQTable Component Tests", () => {
  const sampleItems: BOQItem[] = [
    {
      item_number: "1.1",
      description: "Excavation in foundation",
      category: "earthwork",
      quantity: 100,
      unit: "cum",
      unit_rate: 250,
      amount: 25000,
      is_manual: false,
      calculation_type: "excavation",
    },
    {
      item_number: "1.2",
      description: "Reinforced TMT Fe500 Steel",
      category: "steel",
      quantity: 500,
      unit: "kg",
      unit_rate: 70,
      amount: 35000,
      is_manual: true,
    },
  ];

  it("renders items and displays live calculated monetary totals", () => {
    const onItemsChange = vi.fn();

    render(
      <I18nProvider>
        <BOQTable
          items={sampleItems}
          onItemsChange={onItemsChange}
          overheadPct={5}
          contingencyPct={3}
          discountPct={2}
          gstPct={18}
        />
      </I18nProvider>
    );

    expect(screen.getByText("Excavation in foundation")).toBeInTheDocument();
    expect(screen.getByText("Reinforced TMT Fe500 Steel")).toBeInTheDocument();

    // Check badges
    expect(screen.getByText("excavation")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();

    // Check financial values
    expect(screen.getByText("₹60,000.00")).toBeInTheDocument(); // Subtotal
    expect(screen.getByText("₹75,048.00")).toBeInTheDocument(); // Grand Total
  });

  it("duplicates an item when duplicate button is clicked", () => {
    const onItemsChange = vi.fn();

    render(
      <I18nProvider>
        <BOQTable
          items={sampleItems}
          onItemsChange={onItemsChange}
        />
      </I18nProvider>
    );

    const dupButtons = screen.getAllByTitle("Duplicate");
    fireEvent.click(dupButtons[0]);

    expect(onItemsChange).toHaveBeenCalled();
    const calledWith = onItemsChange.mock.calls[0][0];
    expect(calledWith.length).toBe(3);
    expect(calledWith[2].description).toContain("(Copy)");
  });

  it("deletes an item when delete button is clicked", () => {
    const onItemsChange = vi.fn();

    render(
      <I18nProvider>
        <BOQTable
          items={sampleItems}
          onItemsChange={onItemsChange}
        />
      </I18nProvider>
    );

    const deleteButtons = screen.getAllByTitle("Delete");
    fireEvent.click(deleteButtons[0]);

    expect(onItemsChange).toHaveBeenCalled();
    const calledWith = onItemsChange.mock.calls[0][0];
    expect(calledWith.length).toBe(1);
    expect(calledWith[0].item_number).toBe("1.2");
  });
});
