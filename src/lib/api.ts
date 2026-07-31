import type { ApiKeyRecord, OrgNode, SyncLogRecord } from "../types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Error ${res.status} al llamar ${url}`);
  }
  return body as T;
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
