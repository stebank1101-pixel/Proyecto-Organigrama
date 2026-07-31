export type RoleType = "executive" | "director" | "manager" | "employee";

export type NodeStatus = "active" | "inactive";

export interface OrgMetrics {
  headcount: number;
  budget: string;
}

export interface OrgNode {
  id: string;
  name: string;
  title: string;
  department: string;
  sede: string;
  email: string;
  phone: string;
  avatar: string;
  roleType: RoleType;
  parentId: string | null;
  freeX: number;
  freeY: number;
  metrics: OrgMetrics;
  status: NodeStatus;
  customBadge: string;
  iconName: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  provider: string;
  status: string;
  created: string;
}

export interface SyncLogRecord {
  id: string;
  timestamp: string;
  system: string;
  status: string;
  details: string;
  nodesUpdated: number;
}

export type ViewMode = "tree" | "free";

export type TabId = "chart" | "ai" | "hr";
