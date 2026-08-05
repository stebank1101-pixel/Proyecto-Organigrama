import { Building2 } from "lucide-react";
import { forwardRef } from "react";
import { useT } from "../lib/i18n";
import { groupNodesBySede } from "../lib/workCenters";
import type { OrgNode } from "../types";
import { TreeView } from "./TreeView";

interface AllCentersOverviewProps {
  nodes: OrgNode[];
  allSedes: string[];
  compact?: boolean;
}

function noop() {}

export const AllCentersOverview = forwardRef<HTMLDivElement, AllCentersOverviewProps>(function AllCentersOverview(
  { nodes, allSedes, compact },
  ref
) {
  const t = useT();
  const groups = groupNodesBySede(nodes, allSedes);

  return (
    <div ref={ref} className="flex flex-col gap-8 bg-white p-8">
      {groups.map((group) => (
        <div key={group.sede || "sin-centro"}>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Building2 className="h-4 w-4 text-slate-400" />
            {group.label}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {t.common.collaboratorCount(group.nodes.length)}
            </span>
          </div>
          {group.nodes.length === 0 ? (
            <p className="text-xs text-slate-400">{t.allCenters.noCollaborators}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
              <TreeView nodes={group.nodes} onEdit={noop} onDelete={noop} onAddChild={noop} onNodeMove={noop} readOnly compact={compact} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
});
