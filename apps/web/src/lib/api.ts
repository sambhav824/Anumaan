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
    filters?: { status?: string; search?: string; skip?: number; limit?: number }
  ) => {
    const params = new URLSearchParams();
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
};
