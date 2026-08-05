import type { OrgNode, WorkCenter } from "../types";

export type CenterSelection = string | "ALL" | null;

export interface WorkCenterRow {
  name: string;
  count: number;
  address: string;
  email: string;
  phone: string;
  headcount: number;
  budget: string;
  icon: string;
  isDefault: boolean;
  logo: string;
  backgroundColor: string;
  backgroundImage: string;
}

export interface SedeGroup {
  sede: string;
  label: string;
  nodes: OrgNode[];
}

export function computeSedeCounts(nodes: OrgNode[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const n of nodes) {
    if (!n.sede) continue;
    counts.set(n.sede, (counts.get(n.sede) || 0) + 1);
  }
  return counts;
}

export function computeAllSedes(nodes: OrgNode[], workCenters: WorkCenter[]): string[] {
  const nodeSedes = nodes.map((n) => n.sede).filter(Boolean);
  const centerNames = workCenters.map((c) => c.name);
  return Array.from(new Set([...nodeSedes, ...centerNames])).sort();
}

export function computeWorkCenterRows(nodes: OrgNode[], workCenters: WorkCenter[]): WorkCenterRow[] {
  const allSedes = computeAllSedes(nodes, workCenters);
  const counts = computeSedeCounts(nodes);
  return allSedes.map((name) => {
    const profile = workCenters.find((c) => c.name === name);
    return {
      name,
      count: counts.get(name) ?? 0,
      address: profile?.address ?? "",
      email: profile?.email ?? "",
      phone: profile?.phone ?? "",
      headcount: profile?.headcount ?? 0,
      budget: profile?.budget ?? "",
      icon: profile?.icon ?? "",
      isDefault: profile?.isDefault ?? false,
      logo: profile?.logo ?? "",
      backgroundColor: profile?.backgroundColor ?? "",
      backgroundImage: profile?.backgroundImage ?? "",
    };
  });
}

// Groups nodes by sede for the read-only "Todos" overview. Every known center gets its
// own group (even with 0 nodes), plus a trailing "Sin centro asignado" group for nodes
// left behind after a work center was deleted.
export function groupNodesBySede(nodes: OrgNode[], allSedes: string[]): SedeGroup[] {
  const groups: SedeGroup[] = allSedes.map((sede) => ({
    sede,
    label: sede,
    nodes: nodes.filter((n) => n.sede === sede),
  }));
  const orphanNodes = nodes.filter((n) => !n.sede);
  if (orphanNodes.length > 0) {
    groups.push({ sede: "", label: "Sin centro asignado", nodes: orphanNodes });
  }
  return groups;
}
