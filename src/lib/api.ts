import type { ApiKeyRecord, OrgNode, SyncLogRecord, UserProfile } from "../types";

const TOKEN_STORAGE_KEY = "orgcraft.auth.token";

let authToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthToken() {
  return authToken;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(url, {
    headers,
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Error ${res.status} al llamar ${url}`);
  }
  return body as T;
}

export function login(email: string, password: string): Promise<{ success: boolean; token: string; user: UserProfile }> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchMe(): Promise<{ success: boolean; user: UserProfile }> {
  return request("/api/auth/me");
}

export function logout(): Promise<{ success: boolean }> {
  return request("/api/auth/logout", { method: "POST" });
}

export function fetchUsers(): Promise<{ data: UserProfile[] }> {
  return request("/api/v1/users");
}

export function createUserProfile(payload: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "viewer";
}): Promise<{ success: boolean; data: UserProfile }> {
  return request("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteUserProfile(id: string): Promise<{ success: boolean }> {
  return request(`/api/v1/users/${id}`, { method: "DELETE" });
}

export function fetchNodes(filters?: { sede?: string; department?: string }): Promise<{ data: OrgNode[] }> {
  const params = new URLSearchParams();
  if (filters?.sede && filters.sede !== "all") params.set("sede", filters.sede);
  if (filters?.department && filters.department !== "all") params.set("department", filters.department);
  const qs = params.toString();
  return request(`/api/v1/nodes${qs ? `?${qs}` : ""}`);
}

export function bulkSyncNodes(nodes: OrgNode[]): Promise<{ success: boolean; count: number }> {
  return request("/api/v1/nodes/bulk-sync", {
    method: "POST",
    body: JSON.stringify({ nodes }),
  });
}

export function fetchApiKeys(): Promise<{ data: ApiKeyRecord[] }> {
  return request("/api/v1/integrations/keys");
}

export function createApiKey(name: string, provider: string): Promise<{ data: ApiKeyRecord }> {
  return request("/api/v1/integrations/keys", {
    method: "POST",
    body: JSON.stringify({ name, provider }),
  });
}

export function fetchSyncLogs(): Promise<{ data: SyncLogRecord[] }> {
  return request("/api/v1/integrations/logs");
}

export function triggerHrSync(payload: {
  provider: string;
  mode: "append" | "replace";
  employees: Array<Record<string, unknown>>;
}): Promise<{ success: boolean; message: string; totalProcessed: number; currentTotalNodes: number }> {
  return request("/api/v1/hr/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateAiOrg(payload: {
  prompt: string;
  companyType?: string;
  headcount?: number;
}): Promise<{ success: boolean; nodes: OrgNode[] }> {
  return request("/api/ai/generate-org", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
