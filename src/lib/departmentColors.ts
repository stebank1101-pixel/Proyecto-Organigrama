export interface DepartmentStyle {
  ring: string;
  badge: string;
  iconBg: string;
  header: string;
}

// Every card and icon uses the same corporate blue (matching the CHEC logo) instead of a
// department-coded palette — `department` is kept as a parameter for API compatibility with
// callers, but no longer changes the result.
const BRAND_BLUE: DepartmentStyle = {
  ring: "ring-blue-300 border-blue-300",
  badge: "bg-blue-50 text-blue-700 border-blue-200",
  iconBg: "bg-blue-800",
  header: "bg-blue-900",
};

export function getDepartmentStyle(_department?: string | null): DepartmentStyle {
  return BRAND_BLUE;
}
