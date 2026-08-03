export type RoleType = "executive" | "director" | "manager" | "employee";

export type NodeStatus = "active" | "inactive";

export interface OrgMetrics {
  headcount: number;
  budget: string;
}

export interface Assignee {
  id: string;
  name: string;
  avatar: string;
}

export interface WorkCenter {
  name: string;
  address: string;
  email: string;
  phone: string;
  headcount: number;
  budget: string;
}

export interface OrgNode {
  id: string;
  name: string;
  title: string;
  assignees: Assignee[];
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
  cardColor?: string;
  textColor?: string;
  fontFamily?: string;
  customIcon?: string;
}

export interface FontOption {
  label: string;
  value: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { label: "Predeterminada (Inter)", value: "" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Courier New (mono)", value: "'Courier New', monospace" },
];

export const CARD_COLOR_PRESETS: string[] = [
  "#ffffff",
  "#f8fafc",
  "#eff6ff",
  "#ecfdf5",
  "#fefce8",
  "#fef2f2",
  "#f5f3ff",
  "#0f172a",
];

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

export type TabId = "chart" | "ai" | "hr" | "profiles";

export type UserRole = "admin" | "viewer";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdBy: string | null;
  createdAt: string;
}
