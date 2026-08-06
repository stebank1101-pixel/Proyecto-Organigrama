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
  icon?: string;
  /** The one work center (at most) that opens automatically when the Organigrama tab
   * loads, instead of the "Centros de trabajo" picker screen. */
  isDefault?: boolean;
  /** Shown on this center's own org chart canvas (and in its exports), separate from the
   * small `icon` used for picker/manager cards. */
  logo?: string;
  /** Custom canvas background for this center's org chart. backgroundImage tiles (repeats)
   * rather than stretching, so it stays a clean corporate pattern at any canvas size. */
  backgroundColor?: string;
  backgroundImage?: string;
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
  /** Manual bend for the connector line coming from this node's parent, stored as an
   * offset from the automatic midpoint (not an absolute point) so the curve's shape
   * stays put as either connected card is dragged around. Undefined = no manual bend. */
  lineOffsetX?: number;
  lineOffsetY?: number;
  /** Other nodes this one has a "functional coordination" line to — independent of the
   * parentId hierarchy (a node can have several of these). Each link picks its own
   * solid/dashed style (same convention as the reference org chart's line legend) and can
   * be bent by dragging its midpoint — offsetX/Y from the automatic midpoint. */
  coordinationLinks?: { targetId: string; style: "solid" | "dashed"; offsetX?: number; offsetY?: number }[];
  /** When set, this node acts as a shortcut into another work center's chart: clicking its
   * card (a plain click, not a drag) navigates there instead of showing its own data. Lets
   * one "hub" org chart link out to every other center without touching how normal nodes
   * behave — existing nodes simply never set this field. */
  linkTargetSede?: string;
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
