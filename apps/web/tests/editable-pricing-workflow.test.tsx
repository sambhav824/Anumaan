import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BOQTable } from "../src/components/BOQTable";
import { I18nProvider } from "../src/context/I18nContext";
import { BOQItem } from "../src/lib/api";
import {
  calculateQuickEstimate,
  calculateBoundaryWall,
  calculateEstimateTotals,
} from "../src/lib/calculations";

vi.mock("../src/context/OrgContext", () => ({
  useSafeOrg: () => ({
    currentOrg: { id: "org-1", name: "Alpha Builders", state: "Maharashtra" },
    activeOrgId: "org-1",
  }),
}));

vi.mock("../src/lib/api", () => ({
  api: {
    listRateItems: vi.fn().mockResolvedValue([]),
    updateRateItem: vi.fn().mockResolvedValue({ id: "rate-1", combined_rate: 650 }),
    createRateItem: vi.fn().mockResolvedValue({ id: "rate-new", combined_rate: 650 }),
  },
}));

describe("Automatic Material & Editable Pricing Workflow Integration", () => {
  const initialItems: BOQItem[] = [
    {
      id: "item-1",
      item_number: "1.1",
      description: "OPC 53 Grade Cement Bags",
      category: "material",
      quantity: 50,
      unit: "bag",
      unit_rate: 380,
      amount: 19000,
      is_manual: false,
      rate_item_id: "rate-cem-53",
    },
    {
      id: "item-2",
      item_number: "2.1",
      description: "TMT Fe 500D Reinforcement Steel",
      category: "reinforcement",
      quantity: 2,
      unit: "tonne",
      unit_rate: 64000,
      amount: 128000,
      is_manual: false,
    },
  ];

  it("renders editable rate input and allows contractor to override rate directly", () => {
    const handleItemsChange = vi.fn();

    render(
      <I18nProvider>
        <BOQTable
          items={initialItems}
          onItemsChange={handleItemsChange}
          organizationId="org-1"
          overheadPct={10}
          contingencyPct={5}
          gstPct={18}
          readOnly={false}
        />
      </I18nProvider>
    );

    // Verify item descriptions are visible
    expect(screen.getByText("OPC 53 Grade Cement Bags")).toBeInTheDocument();
    expect(screen.getByText("TMT Fe 500D Reinforcement Steel")).toBeInTheDocument();

    // Find the unit rate inputs
    const rateInputs = screen.getAllByTitle(/Edit unit rate in ₹/i);
    expect(rateInputs.length).toBe(2);

    // Initial value check
    expect((rateInputs[0] as HTMLInputElement).value).toBe("380");

    // Edit the rate from 380 to 410 directly inside the row
    fireEvent.change(rateInputs[0], { target: { value: "410" } });

    // onItemsChange must be called immediately with the new rate and recalculated line amount
    expect(handleItemsChange).toHaveBeenCalled();
    const updatedCall = handleItemsChange.mock.calls[0][0];
    expect(updatedCall[0].unit_rate).toBe(410);
    expect(updatedCall[0].amount).toBe(50 * 410); // 20,500
  });

  it("allows inline quantity adjustments and recalculates line amount", () => {
    const handleItemsChange = vi.fn();

    render(
      <I18nProvider>
        <BOQTable
          items={initialItems}
          onItemsChange={handleItemsChange}
          organizationId="org-1"
          readOnly={false}
        />
      </I18nProvider>
    );

    // Find quantity input
    const qtyInputs = screen.getAllByTitle(/Click to edit quantity directly/i);
    expect(qtyInputs.length).toBe(2);

    // Change quantity of steel from 2 tonnes to 3.5 tonnes
    fireEvent.change(qtyInputs[1], { target: { value: "3.5" } });

    expect(handleItemsChange).toHaveBeenCalled();
    const updatedCall = handleItemsChange.mock.calls[0][0];
    expect(updatedCall[1].quantity).toBe(3.5);
    expect(updatedCall[1].amount).toBe(3.5 * 64000); // 224,000
  });

  it("calculates quick estimate budget, cost/sqft, and material consumption accurately", () => {
    const quick = calculateQuickEstimate(1200, 2, "standard", "maharashtra_pwd");

    // 1200 sqft × 2 floors = 2400 sqft
    expect(quick.totalAreaSqft).toBe(2400);
    expect(quick.costPerSqft).toBe(2100);
    expect(quick.totalCost).toBe(2400 * 2100); // 50,40,000

    // Material consumption benchmarks
    expect(quick.cementBags).toBeGreaterThan(1000); // ~1,080 bags
    expect(quick.steelTonnes).toBeGreaterThan(8);   // ~9.12 tonnes
    expect(quick.sandBrass).toBeGreaterThan(30);    // ~42 brass
    expect(quick.aggBrass).toBeGreaterThan(25);     // ~33.6 brass
    expect(quick.bricksCount).toBeGreaterThan(40000); // ~45,600 bricks
  });

  it("calculates boundary wall net masonry, excavation, PCC, and brick count accurately", () => {
    // 50m long wall, 2m high, 230mm thick, with 3m x 2m gate opening
    const bw = calculateBoundaryWall(50, 2, 230, "clay_brick", 3, 2, 0.8);

    // Gross area = 50 * 2 = 100 sqm
    // Gate area = 3 * 2 = 6 sqm
    // Net area = 94 sqm
    expect(bw.breakdown.net_area_sqm).toBe(94);

    // Masonry volume = 94 * 0.23m = 21.62 cum
    expect(bw.quantity).toBeCloseTo(21.62, 1);

    // Bricks count = ~21.62 * 525 = ~11,350 bricks
    expect(bw.breakdown.bricks_count).toBeGreaterThan(11000);

    // Excavation = 50 * (0.23 + 0.3) * 0.8 = 21.2 cum
    expect(bw.breakdown.excavation_cum).toBeCloseTo(21.2, 1);
  });

  it("prevents double-counting in financial totals without discount", () => {
    const items = [
      { quantity: 10, unit_rate: 500 }, // 5,000
      { quantity: 5, unit_rate: 1000 }, // 5,000
    ];
    // subtotal = 10,000
    // overhead 10% = 1,000
    // contingency 5% = 500
    // taxable = 11,500
    // gst 18% = 2,070
    // grand total = 13,570
    const totals = calculateEstimateTotals(items, 10, 5, 0, 18);

    expect(totals.subtotal).toBe(10000);
    expect(totals.overheadAmount).toBe(1000);
    expect(totals.contingencyAmount).toBe(500);
    expect(totals.discountAmount).toBe(0);
    expect(totals.taxableAmount).toBe(11500);
    expect(totals.gstAmount).toBe(2070);
    expect(totals.grandTotal).toBe(13570);
  });
});

