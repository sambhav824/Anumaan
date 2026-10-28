import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RateLibraryPage from "../src/app/(dashboard)/rate-library/page";
import { I18nProvider } from "../src/context/I18nContext";

vi.mock("../src/context/OrgContext", () => ({
  useOrg: () => ({
    currentOrg: { id: "org-1", name: "Alpha Builders", state: "Maharashtra" },
    organizations: [{ id: "org-1", name: "Alpha Builders" }],
    activeOrgId: "org-1",
    loading: false,
    selectOrg: vi.fn(),
  }),
}));

// Mock the api module
vi.mock("../src/lib/api", () => {
  const sampleRates = [
    {
      id: "rate-1",
      organization_id: "org-1",
      code: "STL-TMT-12MM",
      name: "TMT Fe500 Steel 12mm",
      category: "material",
      rate_type: "raw_material",
      description: "High yield strength deformed steel bars",
      specification: "IS 1786:2008 Grade Fe 500D",
      unit: "tonne",
      material_rate: 62000,
      labour_rate: 0,
      equipment_rate: 0,
      combined_rate: 62000,
      rate_source: "Supplier Quote",
      supplier_or_source_name: "Tata Tiscon",
      region: "maharashtra_pwd",
      rate_status: "verified_source",
      is_custom: false,
      is_archived: false,
      default_item_id: "STL-TMT-12MM",
      notes: "Delivered to site",
      created_at: "2026-03-01T10:00:00Z",
      updated_at: "2026-03-01T10:00:00Z",
    },
    {
      id: "rate-2",
      organization_id: "org-1",
      code: "CEM-OPC-53",
      name: "OPC 53 Grade Cement",
      category: "material",
      rate_type: "raw_material",
      description: "Ordinary Portland Cement 53 Grade",
      specification: "IS 269:2015",
      unit: "bag",
      material_rate: 385,
      labour_rate: 0,
      equipment_rate: 0,
      combined_rate: 385,
      rate_source: "Schedule of Rates",
      supplier_or_source_name: "Maharashtra PWD CSR 2023-24",
      region: "maharashtra_pwd",
      rate_status: "verified_source",
      is_custom: true,
      is_archived: false,
      default_item_id: "CEM-OPC-53",
      notes: "Fresh factory stock",
      created_at: "2026-03-02T10:00:00Z",
      updated_at: "2026-03-02T10:00:00Z",
    },
  ];

  const mockApi = {
    listRateItems: vi.fn().mockImplementation((_orgId, params) => {
      let filtered = [...sampleRates];
      if (params?.search) {
        filtered = filtered.filter((r) =>
          r.name.toLowerCase().includes(params.search.toLowerCase())
        );
      }
      return Promise.resolve(filtered);
    }),
    createRateItem: vi.fn().mockImplementation((orgId, data) =>
      Promise.resolve({
        id: "rate-new",
        organization_id: orgId,
        ...data,
        combined_rate: Number(data.material_rate) || 0,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    ),
    updateRateItem: vi.fn().mockResolvedValue({}),
    deleteRateItem: vi.fn().mockResolvedValue({}),
    getRateItem: vi.fn(),
    getRateRegions: vi.fn().mockResolvedValue([
      {
        id: "national_cpwd",
        name: "National (CPWD Delhi Benchmark)",
        state: "National / Delhi NCR",
        authority: "CPWD",
        source_doc: "CPWD DSR 2023 / 2024",
        default: true,
      },
      {
        id: "maharashtra_pwd",
        name: "Maharashtra (Palghar / Mumbai MMR / Pune)",
        state: "Maharashtra",
        authority: "Maharashtra PWD",
        source_doc: "Maharashtra PWD CSR 2023-2024",
        default: false,
      },
    ]),
    seedDefaultRates: vi.fn().mockResolvedValue({
      message: "Synced 33 canonical material rates",
      region: "maharashtra_pwd",
      region_name: "Maharashtra (Palghar / Mumbai MMR / Pune)",
      seeded_count: 33,
      updated_count: 0,
      total_catalogue_items: 33,
    }),
    resetRateToDefault: vi.fn().mockResolvedValue({
      id: "rate-2",
      name: "OPC 53 Grade Cement",
      is_custom: false,
      material_rate: 385,
      combined_rate: 385,
    }),
    reconcileRateLibrary: vi.fn().mockResolvedValue({
      audit_report: {
        total_before: 2,
        active_materials_now: 2,
        labour_items_archived: 0,
        equipment_items_archived: 0,
      },
    }),
  };

  return {
    api: mockApi,
    ...mockApi,
  };
});

describe("Rate Library Page Component Tests", () => {
  beforeEach(() => {
    localStorage.setItem("anumaan_active_org_id", "org-1");
  });

  it("renders rate library header, regional benchmark, controls, and loaded rates", async () => {
    render(
      <I18nProvider>
        <RateLibraryPage />
      </I18nProvider>
    );

    // Verify main heading
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();

    // Verify Materials Only badge
    expect(await screen.findByText("Materials Only")).toBeInTheDocument();

    // Verify rate items are displayed
    expect(await screen.findByText("TMT Fe500 Steel 12mm")).toBeInTheDocument();
    expect(await screen.findByText("OPC 53 Grade Cement")).toBeInTheDocument();

    // Verify location banner with Palghar / Maharashtra default
    expect(screen.getAllByText(/Palghar/i).length).toBeGreaterThanOrEqual(1);
  });

  it("opens add material modal when add button is clicked", async () => {
    render(
      <I18nProvider>
        <RateLibraryPage />
      </I18nProvider>
    );

    await screen.findByText("TMT Fe500 Steel 12mm");

    const addBtn = await screen.findByRole("button", { name: /Add Material/i });
    fireEvent.click(addBtn);

    // Modal should appear for pure material entry
    expect(await screen.findByText("Add Construction Material")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/OPC 53 Grade Cement/i)).toBeInTheDocument();
  });

  it("filters items by search input", async () => {
    render(
      <I18nProvider>
        <RateLibraryPage />
      </I18nProvider>
    );

    await screen.findByText("TMT Fe500 Steel 12mm");

    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: "Cement" } });

    // Cement should be visible, Steel should be filtered out
    expect(await screen.findByText("OPC 53 Grade Cement")).toBeInTheDocument();
    expect(screen.queryByText("TMT Fe500 Steel 12mm")).not.toBeInTheDocument();
  });
});
