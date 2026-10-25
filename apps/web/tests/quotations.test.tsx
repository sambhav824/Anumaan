import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { I18nProvider } from "../src/context/I18nContext";
import { api, Quotation } from "../src/lib/api";
import { formatIndianCurrency, calculateEstimateTotals } from "../src/lib/calculations";
import QuotationsPage from "../src/app/(dashboard)/quotations/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
  useParams: () => ({
    id: "quote-123",
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock OrgContext
const mockCurrentOrg = {
  id: "org-1",
  name: "Apex Constructions Pvt Ltd",
  slug: "apex-constructions",
  role: "admin",
  address: "101 High Street, Pune",
  gstin: "27AAAAA0000A1Z5",
};

vi.mock("../src/context/OrgContext", () => ({
  useOrg: () => ({
    currentOrg: mockCurrentOrg,
    userOrgs: [mockCurrentOrg],
    loading: false,
    switchOrg: vi.fn(),
  }),
}));

// Mock API
vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<any>("../src/lib/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      listQuotations: vi.fn(),
      getQuotation: vi.fn(),
      createQuotation: vi.fn(),
      updateQuotation: vi.fn(),
      issueQuotation: vi.fn(),
      updateQuotationStatus: vi.fn(),
      duplicateQuotation: vi.fn(),
      downloadQuotationPdf: vi.fn(),
      exportQuotationExcel: vi.fn(),
    },
  };
});

describe("Phase D: Quotation Engine & Export Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Financial Totals & Tax Transparency Calculations", () => {
    it("handles unconfigured tax transparently with zero tax liability", () => {
      // BOQ total 100,000, 10% overhead, 5% contingency, 0 discount, 0 tax
      const items = [
        {
          quantity: 20,
          unit_rate: 5000,
        },
      ];

      const totals = calculateEstimateTotals(items, 10, 5, 0, 0);
      expect(totals.subtotal).toBe(100000);
      expect(totals.overheadAmount).toBe(10000);
      expect(totals.contingencyAmount).toBe(5000);
      expect(totals.taxableAmount).toBe(115000);
      // When tax rate is 0 / unconfigured
      expect(totals.gstAmount).toBe(0);
      expect(totals.grandTotal).toBe(115000);
    });

    it("calculates statutory GST explicitly when configured", () => {
      const items = [
        {
          quantity: 100,
          unit_rate: 1500,
        },
      ];

      // 5% overhead, 0% contingency, 0% discount, 18% GST
      const totals = calculateEstimateTotals(items, 5, 0, 0, 18);
      expect(totals.subtotal).toBe(150000);
      expect(totals.overheadAmount).toBe(7500);
      expect(totals.taxableAmount).toBe(157500);
      // Tax: 157500 * 0.18 = 28350
      expect(totals.gstAmount).toBe(28350);
      expect(totals.grandTotal).toBe(185850);
    });

    it("clamps discount to not exceed pre-tax taxable base", () => {
      const items = [
        {
          quantity: 100,
          unit_rate: 100,
        },
      ];

      // 100% discount on 10,000 subtotal must clamp taxable amount to 0
      const totals = calculateEstimateTotals(items, 0, 0, 100, 18);
      expect(totals.taxableAmount).toBe(0);
      expect(totals.gstAmount).toBe(0);
      expect(totals.grandTotal).toBe(0);
    });

    it("formats INR currency correctly with Indian number grouping and symbol", () => {
      expect(formatIndianCurrency(1234567.89)).toContain("12,34,567.89");
      expect(formatIndianCurrency(50000)).toContain("50,000.00");
      expect(formatIndianCurrency(0)).toContain("0.00");
    });
  });

  describe("Quotations Listing & UI Workflow", () => {
    const mockQuotations: Quotation[] = [
      {
        id: "q-1",
        quotation_number: "QT-202610-0001",
        estimate_id: "est-1",
        project_id: "proj-1",
        organization_id: "org-1",
        status: "draft",
        language: "en",
        estimate_name: "Tower A Substructure",
        estimate_number: "EST-2026-001",
        project_name: "Greenfield Residential",
        client_name: "Shri Rajesh Patil",
        issue_date: undefined,
        valid_until_date: "2026-11-24",
        subtotal: 500000,
        overhead_amount: 25000,
        contingency_amount: 25000,
        discount_amount: 0,
        taxable_amount: 550000,
        tax_configured: false,
        tax_name: "GST",
        tax_rate: 0,
        tax_amount: 0,
        total_amount: 550000,
        grand_total: 550000,
        created_at: "2026-10-24T10:00:00Z",
        updated_at: "2026-10-24T10:00:00Z",
      },
      {
        id: "q-2",
        quotation_number: "QT-202610-0002",
        estimate_id: "est-2",
        project_id: "proj-2",
        organization_id: "org-1",
        status: "issued",
        language: "mr",
        estimate_name: "Highway Widening Ch 0+000 to 2+500",
        estimate_number: "EST-2026-002",
        project_name: "Pune-Satara Bypass",
        client_name: "MSRDC Infra Division",
        issue_date: "2026-10-24",
        valid_until_date: "2026-11-24",
        subtotal: 1200000,
        overhead_amount: 50000,
        contingency_amount: 50000,
        discount_amount: 0,
        taxable_amount: 1300000,
        tax_configured: true,
        tax_name: "GST",
        tax_rate: 18,
        tax_amount: 234000,
        total_amount: 1534000,
        grand_total: 1534000,
        created_at: "2026-10-24T10:30:00Z",
        updated_at: "2026-10-24T10:30:00Z",
      },
    ];

    it("renders quotation list with correct status badges and tax indicators", async () => {
      (api.listQuotations as any).mockResolvedValue(mockQuotations);

      render(
        <I18nProvider>
          <QuotationsPage />
        </I18nProvider>
      );

      // Verify page title
      expect(screen.getByText("Quotations")).toBeDefined();

      // Wait for quotations to load
      await waitFor(() => {
        expect(screen.getByText("QT-202610-0001")).toBeDefined();
        expect(screen.getByText("QT-202610-0002")).toBeDefined();
      });

      // Verify status text exists
      expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Issued").length).toBeGreaterThan(0);

      // Verify unconfigured tax indicator
      expect(screen.getByText(/Tax not configured/i)).toBeDefined();

      // Verify Link to New Quotation exists
      const newBtn = screen.getByText("New Quotation");
      expect(newBtn).toBeDefined();
    });

    it("filters quotation list by status and search query", async () => {
      (api.listQuotations as any).mockImplementation((orgId: string, filters?: any) => {
        if (filters?.search === "Highway") {
          return Promise.resolve([mockQuotations[1]]);
        }
        return Promise.resolve(mockQuotations);
      });

      render(
        <I18nProvider>
          <QuotationsPage />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("QT-202610-0001")).toBeDefined();
      });

      // Filter by search form submit
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: "Highway" } });
      fireEvent.submit(searchInput.closest("form")!);

      await waitFor(() => {
        expect(screen.queryByText("QT-202610-0001")).toBeNull();
        expect(screen.getByText("QT-202610-0002")).toBeDefined();
      });
    });

    it("triggers PDF download and Excel export without page reloads", async () => {
      (api.listQuotations as any).mockResolvedValue(mockQuotations);
      (api.downloadQuotationPdf as any).mockResolvedValue(undefined);
      (api.exportQuotationExcel as any).mockResolvedValue(undefined);

      render(
        <I18nProvider>
          <QuotationsPage />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("QT-202610-0002")).toBeDefined();
      });

      // Click PDF download button on the second quotation row (q-2)
      const pdfButtons = screen.getAllByTitle("Download PDF");
      expect(pdfButtons.length).toBe(2);
      fireEvent.click(pdfButtons[1]);

      await waitFor(() => {
        expect(api.downloadQuotationPdf).toHaveBeenCalledWith(
          "org-1",
          "q-2",
          "QT-202610-0002.pdf"
        );
      });

      // Click Excel export button on the second quotation row (q-2)
      const excelButtons = screen.getAllByTitle("Export Excel");
      expect(excelButtons.length).toBe(2);
      fireEvent.click(excelButtons[1]);

      await waitFor(() => {
        expect(api.exportQuotationExcel).toHaveBeenCalledWith(
          "org-1",
          "q-2",
          "QT-202610-0002.xlsx"
        );
      });
    });
  });
});
