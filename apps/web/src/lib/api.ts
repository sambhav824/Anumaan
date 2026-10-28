const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = "An unexpected error occurred.";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}


export interface BOQItem {
  id?: string;
  organization_id?: string;
  estimate_id?: string;
  item_number: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  amount?: number;
  is_manual?: boolean;
  calculation_type?: string;
  calculation_details?: Record<string, any>;
  rate_item_id?: string;
  notes?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Estimate {
  id: string;
  organization_id: string;
  project_id: string;
  project_name?: string;
  project_type?: string;
  client_name?: string;
  estimate_number: string;
  name: string;
  category: "building" | "road";
  status: "draft" | "submitted" | "approved" | "archived";
  overhead_pct: number;
  contingency_pct: number;
  discount_pct: number;
  gst_pct: number;
  notes?: string;
  subtotal: number;
  overhead_amount: number;
  contingency_amount: number;
  discount_amount: number;
  taxable_amount: number;
  gst_amount: number;
  total_amount: number;
  item_count: number;
  items?: BOQItem[];
  snapshot?: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
}


export interface Quotation {
  id: string;
  organization_id: string;
  estimate_id: string;
  estimate_number?: string;
  estimate_name?: string;
  project_id: string;
  client_id?: string;
  project_name?: string;
  client_name?: string;
  quotation_number: string;
  status: "draft" | "issued" | "accepted" | "rejected" | "expired";
  language: "en" | "mr" | "hi";
  issue_date?: string;
  valid_until_date?: string;
  subtotal: number;
  overhead_amount: number;
  contingency_amount: number;
  discount_amount: number;
  taxable_amount: number;
  tax_configured: boolean;
  tax_name: string;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  grand_total?: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationDetail extends Quotation {
  payment_terms?: string;
  exclusions?: string;
  notes?: string;
  client_instructions?: string;
  authorized_signatory_name?: string;
  authorized_signatory_designation?: string;
  overhead_pct: number;
  contingency_pct: number;
  discount_pct: number;
  snapshot?: any;
  items?: Array<{
    item_number: string;
    description: string;
    category: string;
    specification?: string;
    quantity: number;
    unit: string;
    unit_rate: number;
    amount: number;
  }>;
  company_details?: {
    name?: string;
    owner_person?: string;
    email?: string;
    phone?: string;
    business_address?: string;
    city?: string;
    state?: string;
    pin_code?: string;
    gstin?: string;
    logo_url?: string;
  };
  client_details?: {
    name?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    billing_address?: string;
    gstin?: string;
  };
  project_details?: {
    name?: string;
    project_type?: string;
    site_location?: string;
    city?: string;
    state?: string;
    reference_estimate_number?: string;
  };
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; service: string }>("/api/health"),

  // Profile
  getProfile: () => request<any>("/api/profile"),
  updateProfile: (data: { full_name?: string; language_preference?: string; avatar_url?: string }) =>
    request<any>("/api/profile", { method: "PATCH", body: JSON.stringify(data) }),

  // Organizations
  listOrganizations: () => request<any[]>("/api/organizations"),
  createOrganization: (data: any) =>
    request<any>("/api/organizations", { method: "POST", body: JSON.stringify(data) }),
  getOrganization: (orgId: string) => request<any>(`/api/organizations/${orgId}`),
  updateOrganization: (orgId: string, data: any) =>
    request<any>(`/api/organizations/${orgId}`, { method: "PATCH", body: JSON.stringify(data) }),
  getOrgMembers: (orgId: string) => request<any[]>(`/api/organizations/${orgId}/members`),

  // Clients
  listClients: (orgId: string, search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<any[]>(`/api/organizations/${orgId}/clients${q}`);
  },
  createClient: (orgId: string, data: any) =>
    request<any>(`/api/organizations/${orgId}/clients`, { method: "POST", body: JSON.stringify(data) }),
  getClient: (orgId: string, clientId: string) =>
    request<any>(`/api/organizations/${orgId}/clients/${clientId}`),
  updateClient: (orgId: string, clientId: string, data: any) =>
    request<any>(`/api/organizations/${orgId}/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteClient: (orgId: string, clientId: string) =>
    request<void>(`/api/organizations/${orgId}/clients/${clientId}`, { method: "DELETE" }),

  // Projects
  listProjects: (orgId: string, filters?: { search?: string; project_type?: string; status?: string; skip?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.project_type) params.append("project_type", filters.project_type);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.skip !== undefined) params.append("skip", String(filters.skip));
    if (filters?.limit !== undefined) params.append("limit", String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<any[]>(`/api/organizations/${orgId}/projects${qs}`);
  },
  createProject: (orgId: string, data: any) =>
    request<any>(`/api/organizations/${orgId}/projects`, { method: "POST", body: JSON.stringify(data) }),
  getProject: (orgId: string, projId: string) =>
    request<any>(`/api/organizations/${orgId}/projects/${projId}`),
  updateProject: (orgId: string, projId: string, data: any) =>
    request<any>(`/api/organizations/${orgId}/projects/${projId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  archiveProject: (orgId: string, projId: string) =>
    request<any>(`/api/organizations/${orgId}/projects/${projId}/archive`, { method: "POST" }),

  // Dashboard
  getDashboardMetrics: (orgId: string) =>
    request<{
      total_projects: number;
      active_projects: number;
      draft_estimates: number;
      pending_quotations: number;
      accepted_quotations: number;
      total_clients: number;
    }>(`/api/organizations/${orgId}/dashboard-metrics`),

  // Estimates & BOQ
  listEstimates: (
    orgId: string,
    filters?: {
      project_id?: string;
      category?: string;
      status?: string;
      search?: string;
      skip?: number;
      limit?: number;
    }
  ) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append("project_id", filters.project_id);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.skip !== undefined) params.append("skip", String(filters.skip));
    if (filters?.limit !== undefined) params.append("limit", String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Estimate[]>(`/api/organizations/${orgId}/estimates${qs}`);
  },

  createEstimate: (orgId: string, data: any) =>
    request<Estimate>(`/api/organizations/${orgId}/estimates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getEstimate: (orgId: string, estimateId: string) =>
    request<Estimate>(`/api/organizations/${orgId}/estimates/${estimateId}`),

  updateEstimate: (orgId: string, estimateId: string, data: any) =>
    request<Estimate>(`/api/organizations/${orgId}/estimates/${estimateId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateEstimateStatus: (orgId: string, estimateId: string, status: string) =>
    request<Estimate>(`/api/organizations/${orgId}/estimates/${estimateId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteEstimate: (orgId: string, estimateId: string) =>
    request<void>(`/api/organizations/${orgId}/estimates/${estimateId}`, {
      method: "DELETE",
    }),

  addBOQItem: (orgId: string, estimateId: string, item: BOQItem) =>
    request<BOQItem>(`/api/organizations/${orgId}/estimates/${estimateId}/items`, {
      method: "POST",
      body: JSON.stringify(item),
    }),

  saveBOQItems: (orgId: string, estimateId: string, items: BOQItem[]) =>
    request<BOQItem[]>(`/api/organizations/${orgId}/estimates/${estimateId}/items`, {
      method: "PUT",
      body: JSON.stringify(items),
    }),

  deleteBOQItem: (orgId: string, estimateId: string, itemId: string) =>
    request<void>(`/api/organizations/${orgId}/estimates/${estimateId}/items/${itemId}`, {
      method: "DELETE",
    }),

  liveCalculate: (orgId: string, calculation_type: string, params: Record<string, any>) =>
    request<any>(`/api/organizations/${orgId}/estimates/calculate`, {
      method: "POST",
      body: JSON.stringify({ calculation_type, params }),
    }),

  // Quotations
  listQuotations: (
    orgId: string,
    filters?: { project_id?: string; status?: string; search?: string; skip?: number; limit?: number }
  ) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append("project_id", filters.project_id);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.skip !== undefined) params.append("skip", String(filters.skip));
    if (filters?.limit !== undefined) params.append("limit", String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Quotation[]>(`/api/organizations/${orgId}/quotations${qs}`);
  },

  createQuotation: (orgId: string, data: any) =>
    request<QuotationDetail>(`/api/organizations/${orgId}/quotations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getQuotation: (orgId: string, quotationId: string) =>
    request<QuotationDetail>(`/api/organizations/${orgId}/quotations/${quotationId}`),

  updateQuotation: (orgId: string, quotationId: string, data: any) =>
    request<QuotationDetail>(`/api/organizations/${orgId}/quotations/${quotationId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  issueQuotation: (
    orgId: string,
    quotationId: string,
    data: { confirm_tax_configured?: boolean; tax_name?: string; tax_rate?: number; issue_date?: string; valid_until_date?: string }
  ) =>
    request<QuotationDetail>(`/api/organizations/${orgId}/quotations/${quotationId}/issue`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateQuotationStatus: (orgId: string, quotationId: string, status: string) =>
    request<QuotationDetail>(`/api/organizations/${orgId}/quotations/${quotationId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  duplicateQuotation: (orgId: string, quotationId: string) =>
    request<QuotationDetail>(`/api/organizations/${orgId}/quotations/${quotationId}/duplicate`, {
      method: "POST",
    }),

  downloadQuotationPdf: async (orgId: string, quotationId: string, filename?: string) => {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api/organizations/${orgId}/quotations/${quotationId}/pdf`, { headers });
    if (!res.ok) throw new Error("Failed to download quotation PDF");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `Quotation-${quotationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  exportQuotationExcel: async (orgId: string, quotationId: string, filename?: string) => {
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api/organizations/${orgId}/quotations/${quotationId}/excel`, { headers });
    if (!res.ok) throw new Error("Failed to export quotation Excel");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `Quotation-${quotationId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ---------------------------------------------------------------------------
  // Invoices & Milestone Billing
  listInvoices: (
    orgId: string,
    filters?: { project_id?: string; quotation_id?: string; status?: string; search?: string; skip?: number; limit?: number }
  ) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append("project_id", filters.project_id);
    if (filters?.quotation_id) params.append("quotation_id", filters.quotation_id);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.skip !== undefined) params.append("skip", String(filters.skip));
    if (filters?.limit !== undefined) params.append("limit", String(filters.limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Invoice[]>(`/api/organizations/${orgId}/invoices${qs}`);
  },
  createInvoice: (orgId: string, data: any) =>
    request<Invoice>(`/api/organizations/${orgId}/invoices`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getInvoice: (orgId: string, invoiceId: string) =>
    request<Invoice>(`/api/organizations/${orgId}/invoices/${invoiceId}`),
  updateInvoice: (orgId: string, invoiceId: string, data: any) =>
    request<Invoice>(`/api/organizations/${orgId}/invoices/${invoiceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteInvoice: (orgId: string, invoiceId: string) =>
    request<void>(`/api/organizations/${orgId}/invoices/${invoiceId}`, {
      method: "DELETE",
    }),

  // Rate Library Endpoints
  // ---------------------------------------------------------------------------
  listRateItems: (
    orgId: string,
    params?: {
      search?: string;
      category?: string;
      material_group?: string;
      region?: string;
      rate_type?: string;
      is_custom?: boolean;
      rate_status?: string;
      include_labour?: boolean;
      include_archived?: boolean;
      sort_by?: "name" | "updated_at" | "created_at" | "code";
      order?: "asc" | "desc";
      skip?: number;
      limit?: number;
    }
  ) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append("search", params.search);
    if (params?.category) sp.append("category", params.category);
    if (params?.material_group) sp.append("material_group", params.material_group);
    if (params?.region) sp.append("region", params.region);
    if (params?.rate_type) sp.append("rate_type", params.rate_type);
    if (params?.is_custom !== undefined) sp.append("is_custom", String(params.is_custom));
    if (params?.rate_status) sp.append("rate_status", params.rate_status);
    if (params?.include_labour !== undefined) sp.append("include_labour", String(params.include_labour));
    if (params?.include_archived !== undefined) sp.append("include_archived", String(params.include_archived));
    if (params?.sort_by) sp.append("sort_by", params.sort_by);
    if (params?.order) sp.append("order", params.order);
    if (params?.skip !== undefined) sp.append("skip", String(params.skip));
    if (params?.limit !== undefined) sp.append("limit", String(params.limit));
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return request<RateItem[]>(`/api/organizations/${orgId}/rates${qs}`);
  },

  getRateItem: (orgId: string, rateId: string) =>
    request<RateItem>(`/api/organizations/${orgId}/rates/${rateId}`),

  createRateItem: (orgId: string, data: Partial<RateItem>) =>
    request<RateItem>(`/api/organizations/${orgId}/rates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRateItem: (orgId: string, rateId: string, data: Partial<RateItem>) =>
    request<RateItem>(`/api/organizations/${orgId}/rates/${rateId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteRateItem: (orgId: string, rateId: string) =>
    request<void>(`/api/organizations/${orgId}/rates/${rateId}`, {
      method: "DELETE",
    }),

  getRateRegions: () =>
    request<RateRegion[]>("/api/rates/regions"),

  getDefaultCatalogue: (params?: { region?: string; category?: string; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.region) sp.append("region", params.region);
    if (params?.category) sp.append("category", params.category);
    if (params?.search) sp.append("search", params.search);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return request<RateItem[]>(`/api/rates/catalogue${qs}`);
  },

  seedDefaultRates: (orgId: string, data: { region: string; overwrite_custom?: boolean }) =>
    request<{
      message: string;
      region: string;
      region_name: string;
      seeded_count: number;
      updated_count: number;
      total_catalogue_items: number;
    }>(`/api/organizations/${orgId}/rates/seed-defaults`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resetRateToDefault: (orgId: string, rateId: string) =>
    request<RateItem>(`/api/organizations/${orgId}/rates/${rateId}/reset-to-default`, {
      method: "POST",
    }),

  reconcileRateLibrary: (orgId: string) =>
    request<{
      status: string;
      organization_id: string;
      region: string;
      total_before: number;
      canonical_active_materials: number;
      labour_archived: number;
      duplicates_merged: number;
      seeded_canonical: number;
      actions_log: string[];
    }>(`/api/organizations/${orgId}/rates/reconcile-and-deduplicate`, {
      method: "POST",
    }),

  // ---------------------------------------------------------------------------
  // Actual Expense Tracking Endpoints
  // ---------------------------------------------------------------------------
  listExpenses: (orgId: string, estimateId: string) =>
    request<ActualExpense[]>(`/api/organizations/${orgId}/estimates/${estimateId}/expenses`),

  createExpense: (orgId: string, estimateId: string, data: Partial<ActualExpense>) =>
    request<ActualExpense>(`/api/organizations/${orgId}/estimates/${estimateId}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteExpense: (orgId: string, estimateId: string, expenseId: string) =>
    request<void>(`/api/organizations/${orgId}/estimates/${estimateId}/expenses/${expenseId}`, {
      method: "DELETE",
    }),

  getExpenseVariance: (orgId: string, estimateId: string) =>
    request<CostVarianceSummary>(`/api/organizations/${orgId}/estimates/${estimateId}/expenses/variance`),

  // ---------------------------------------------------------------------------
  // AI Drawing-to-BOQ Boundary
  // ---------------------------------------------------------------------------
  analyzeDrawing: async (orgId: string, estimateId: string, file: File, notes?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (notes) formData.append("notes", notes);

    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}/api/organizations/${orgId}/estimates/${estimateId}/drawings/analyze`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errorDetail = "Drawing analysis failed.";
      try {
        const errJson = await res.json();
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } catch {
        errorDetail = await res.text();
      }
      throw new Error(errorDetail);
    }

    return res.json();
  },

  // ---------------------------------------------------------------------------
  // Construction Drawings & Interactive Takeoff
  // ---------------------------------------------------------------------------
  listProjectDrawings: (orgId: string, projectId: string) =>
    request<DrawingItem[]>(`/api/organizations/${orgId}/projects/${projectId}/drawings`),

  uploadProjectDrawing: async (
    orgId: string,
    projectId: string,
    file: File,
    name?: string,
    estimateId?: string
  ): Promise<DrawingDetail> => {
    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);
    if (estimateId) formData.append("estimate_id", estimateId);

    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}/api/organizations/${orgId}/projects/${projectId}/drawings`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errorDetail = "Drawing upload failed.";
      try {
        const errJson = await res.json();
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } catch {
        errorDetail = await res.text();
      }
      throw new Error(errorDetail);
    }
    return res.json();
  },

  getDrawingDetail: (orgId: string, drawingId: string) =>
    request<DrawingDetail>(`/api/organizations/${orgId}/drawings/${drawingId}`),

  updateDrawing: (
    orgId: string,
    drawingId: string,
    data: { name?: string; pages_count?: number; scale_calibrations?: Record<string, any> }
  ) =>
    request<DrawingDetail>(`/api/organizations/${orgId}/drawings/${drawingId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteDrawing: (orgId: string, drawingId: string) =>
    request<{ success: boolean }>(`/api/organizations/${orgId}/drawings/${drawingId}`, {
      method: "DELETE",
    }),

  addDrawingMeasurement: (
    orgId: string,
    drawingId: string,
    data: {
      page_number: number;
      measurement_type: "length" | "area" | "count";
      name: string;
      raw_pixel_value: number;
      calibrated_value: number;
      unit: string;
      points: { x: number; y: number }[];
      color?: string;
      count_category?: string;
      notes?: string;
      construction_mapping?: any;
    }
  ) =>
    request<DrawingMeasurementItem>(`/api/organizations/${orgId}/drawings/${drawingId}/measurements`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateDrawingMeasurement: (
    orgId: string,
    drawingId: string,
    measurementId: string,
    data: {
      name?: string;
      notes?: string;
      color?: string;
      construction_mapping?: any;
    }
  ) =>
    request<DrawingMeasurementItem>(
      `/api/organizations/${orgId}/drawings/${drawingId}/measurements/${measurementId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    ),

  deleteDrawingMeasurement: (orgId: string, drawingId: string, measurementId: string) =>
    request<{ success: boolean }>(
      `/api/organizations/${orgId}/drawings/${drawingId}/measurements/${measurementId}`,
      {
        method: "DELETE",
      }
    ),

  transferMeasurementToEstimate: (
    orgId: string,
    drawingId: string,
    measurementId: string,
    data: {
      estimate_id: string;
      item_category: string;
      thickness_m?: number;
      height_or_depth_m?: number;
      wastage_pct?: number;
      unit_rate?: number;
      custom_description?: string;
    }
  ) =>
    request<{
      success: boolean;
      boq_item_id: string;
      quantity: number;
      unit: string;
      unit_rate: number;
      amount: number;
      message: string;
    }>(
      `/api/organizations/${orgId}/drawings/${drawingId}/measurements/${measurementId}/transfer-to-estimate`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  // ---------------------------------------------------------------------------
  // Geolocation & Reverse Geocoding
  // ---------------------------------------------------------------------------
  reverseGeocode: (lat: number, lon: number) =>
    request<ReverseGeocodeResult>(`/api/geolocation/reverse?lat=${lat}&lon=${lon}`),
};

export interface ReverseGeocodeResult {
  display_name: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country: string;
  latitude: number;
  longitude: number;
  suggested_region_id: string;
  region_name: string;
  authority: string;
  source_doc: string;
  is_fallback: boolean;
  notes?: string;
}

export interface RateRegion {
  id: string;
  name: string;
  state: string;
  authority: string;
  source_doc: string;
  default: boolean;
}

export interface RateItem {
  id: string;
  organization_id: string;
  code?: string;
  name: string;
  category: "material" | "labour" | "equipment" | "other" | "composite" | "subcontract";
  rate_type?: "raw_material" | "labour_only" | "equipment_only" | "completed_work" | "composite" | "subcontract";
  description?: string;
  unit: string;
  material_rate: number;
  labour_rate: number;
  equipment_rate?: number;
  combined_rate: number;
  rate_source?: "Manual" | "Supplier Quote" | "Schedule of Rates";
  supplier_or_source_name?: string;
  location?: string;
  supplier_or_location?: string;
  region?: string;
  source_date?: string;
  rate_status?: "verified_source" | "illustrative_needs_verification";
  specification?: string;
  is_custom?: boolean;
  is_archived?: boolean;
  canonical_id?: string;
  material_group?: string;
  default_item_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ActualExpense {
  id: string;
  organization_id: string;
  estimate_id: string;
  category: "material" | "labour" | "equipment" | "transport" | "subcontract" | "other";
  description: string;
  amount: number;
  expense_date: string;
  vendor_or_payee?: string;
  invoice_or_voucher_ref?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CostVarianceSummary {
  estimate_id: string;
  estimate_name: string;
  estimated_amount: number;
  actual_amount: number;
  difference: number;
  variance_pct: number;
  status: "over_budget" | "under_budget" | "on_budget";
  total_expenses_count: number;
  categories_breakdown: Array<{
    category: string;
    total_amount: number;
    expense_count: number;
  }>;
}


export interface Invoice {
  id: string;
  organization_id: string;
  project_id: string;
  quotation_id?: string;
  invoice_number: string;
  milestone_name: string;
  percentage: number;
  amount: number;
  status: "draft" | "sent" | "paid" | "partially_paid" | "overdue";
  due_date?: string;
  paid_date?: string;
  paid_amount: number;
  payment_method?: string;
  notes?: string;
  project_name?: string;
  client_name?: string;
  quotation_number?: string;
  created_at: string;
  updated_at: string;
}

export interface DrawingItem {
  id: string;
  organization_id: string;
  project_id: string;
  estimate_id?: string | null;
  name: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  file_url: string;
  pages_count: number;
  scale_calibrations?: Record<string, any>;
  measurement_count: number;
  created_at: string;
  updated_at: string;
}

export interface DrawingMeasurementItem {
  id: string;
  drawing_id: string;
  page_number: number;
  measurement_type: "length" | "area" | "count";
  name: string;
  raw_pixel_value: number;
  calibrated_value: number;
  unit: string;
  points: { x: number; y: number }[];
  color?: string;
  count_category?: string;
  notes?: string;
  construction_mapping?: any;
  is_transferred: boolean;
  transferred_to_estimate_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrawingDetail extends DrawingItem {
  measurements: DrawingMeasurementItem[];
}
