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
};
