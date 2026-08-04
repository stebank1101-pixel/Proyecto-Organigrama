export interface DepartmentStyle {
  ring: string;
  badge: string;
  iconBg: string;
  header: string;
}

// A fixed, high-contrast palette (mirrors the department-coded reference org chart:
// each branch gets its own solid color, reused consistently for its header + cards).
const PALETTE: DepartmentStyle[] = [
  { ring: "ring-orange-300 border-orange-300", badge: "bg-orange-50 text-orange-700 border-orange-200", iconBg: "bg-orange-500", header: "bg-orange-500" },
  { ring: "ring-amber-300 border-amber-300", badge: "bg-amber-50 text-amber-700 border-amber-200", iconBg: "bg-amber-500", header: "bg-amber-500" },
  { ring: "ring-purple-300 border-purple-300", badge: "bg-purple-50 text-purple-700 border-purple-200", iconBg: "bg-purple-500", header: "bg-purple-500" },
  { ring: "ring-blue-300 border-blue-300", badge: "bg-blue-50 text-blue-700 border-blue-200", iconBg: "bg-blue-800", header: "bg-blue-900" },
  { ring: "ring-emerald-300 border-emerald-300", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", iconBg: "bg-emerald-600", header: "bg-emerald-600" },
  { ring: "ring-rose-300 border-rose-300", badge: "bg-rose-50 text-rose-800 border-rose-200", iconBg: "bg-rose-800", header: "bg-rose-900" },
  { ring: "ring-teal-300 border-teal-300", badge: "bg-teal-50 text-teal-700 border-teal-200", iconBg: "bg-teal-600", header: "bg-teal-600" },
  { ring: "ring-pink-300 border-pink-300", badge: "bg-pink-50 text-pink-700 border-pink-200", iconBg: "bg-pink-500", header: "bg-pink-500" },
  { ring: "ring-indigo-300 border-indigo-300", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", iconBg: "bg-indigo-500", header: "bg-indigo-500" },
  { ring: "ring-lime-400 border-lime-400", badge: "bg-lime-50 text-lime-700 border-lime-300", iconBg: "bg-lime-600", header: "bg-lime-600" },
];

const FALLBACK: DepartmentStyle = {
  ring: "ring-slate-300 border-slate-300",
  badge: "bg-slate-100 text-slate-600 border-slate-200",
  iconBg: "bg-slate-500",
  header: "bg-slate-500",
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Same department name always maps to the same color, everywhere it's rendered
// (cards, branch headers, previews) — no extra data needs to be stored for this.
export function getDepartmentStyle(department: string | undefined | null): DepartmentStyle {
  if (!department) return FALLBACK;
  return PALETTE[hashString(department) % PALETTE.length];
}
