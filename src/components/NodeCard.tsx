import { ExternalLink, Link2, Pencil, Plus, Trash2, Unlink } from "lucide-react";
import { getDepartmentStyle } from "../lib/departmentColors";
import { useT } from "../lib/i18n";
import { OrgIcon } from "../lib/icons";
import type { OrgNode } from "../types";

interface NodeCardProps {
  node: OrgNode;
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  onRemoveBoss?: (node: OrgNode) => void;
  /** Starts a coordination-line drag straight from this card's toolbar — an explicit handle
   * so connecting two cards doesn't require knowing about Shift+drag or the "Conectar
   * líneas" mode toggle first. Works toward a card dropped in any direction. */
  onStartConnect?: (node: OrgNode, e: React.PointerEvent) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  highlighted?: boolean;
  readOnly?: boolean;
  /** Compact shows only area + cargo; the rest of the node's data still exists underneath
   * and can be revealed by switching to the detailed view (see the toolbar toggle). */
  compact?: boolean;
}

export function NodeCard({
  node,
  onEdit,
  onDelete,
  onAddChild,
  onRemoveBoss,
  onStartConnect,
  dragHandleProps,
  highlighted,
  readOnly,
  compact,
}: NodeCardProps) {
  const t = useT();
  const isLink = !!node.linkTargetSede;
  const style = getDepartmentStyle(node.department);
  const textStyle: React.CSSProperties | undefined = node.textColor ? { color: node.textColor } : undefined;
  const mutedTextStyle: React.CSSProperties | undefined = node.textColor ? { color: node.textColor, opacity: 0.75 } : undefined;
  const cardStyle: React.CSSProperties = {
    ...(node.cardColor ? { backgroundColor: node.cardColor } : {}),
    ...(node.fontFamily ? { fontFamily: node.fontFamily } : {}),
    ...(node.borderColor ? { borderColor: node.borderColor, ["--tw-ring-color" as string]: node.borderColor } : {}),
  };
  // A department line with nothing to show would otherwise render as an empty row —
  // only the secondary lines that actually have content take up space.
  const secondaryParts = [node.department, node.sede].filter(Boolean);

  return (
    <div
      {...dragHandleProps}
      data-card="true"
      style={cardStyle}
      className={`group relative w-[240px] select-none rounded-xl border bg-white p-3 shadow-md transition-shadow ${
        isLink ? "border-dashed border-sky-300 ring-sky-300" : style.ring
      } ${highlighted ? "ring-2 shadow-[0_0_0_3px_rgba(56,189,248,0.25)]" : "ring-1"} ${isLink ? "cursor-pointer hover:bg-sky-50/60" : ""}`}
      title={isLink ? t.nodeCard.openOrgChart(node.linkTargetSede!) : undefined}
    >
      <div
        className={`absolute -top-2.5 -left-2.5 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-white shadow ${
          isLink ? "bg-sky-500" : node.customIcon ? "bg-white ring-1 ring-slate-200" : style.iconBg
        }`}
      >
        {isLink ? (
          <ExternalLink className="h-3.5 w-3.5" />
        ) : node.customIcon ? (
          <img src={node.customIcon} alt="" className="h-full w-full object-cover" />
        ) : (
          <OrgIcon name={node.iconName} className="h-3.5 w-3.5" />
        )}
      </div>

      <span
        className={`absolute top-2 right-2 h-2 w-2 rounded-full ${node.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`}
        title={node.status === "active" ? t.nodeCard.active : t.nodeCard.inactive}
      />

      <div className="pt-1">
        <p className="break-words text-sm font-semibold text-slate-900" style={textStyle} title={node.title}>
          {node.title || t.nodeCard.untitledRole}
        </p>
        {isLink ? (
          <p className="truncate text-xs font-medium text-sky-600" style={node.textColor ? mutedTextStyle : undefined}>
            {t.nodeCard.goToCenter(node.linkTargetSede!)}
          </p>
        ) : compact ? (
          node.department && (
            <p className="truncate text-xs text-slate-500" style={mutedTextStyle} title={node.department}>
              {node.department}
            </p>
          )
        ) : (
          <p className="truncate text-xs text-slate-500" style={mutedTextStyle} title={node.name}>
            {node.name}
          </p>
        )}
      </div>

      {!compact && !isLink && secondaryParts.length > 0 && (
        <p className="mt-2 truncate text-[11px] text-slate-500" style={mutedTextStyle} title={secondaryParts.join(" · ")}>
          {secondaryParts.join(" · ")}
        </p>
      )}

      {!readOnly && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-3 flex justify-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onAddChild(node)}
            className="rounded-full bg-white p-1.5 text-slate-500 shadow ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
            title={t.nodeCard.addSubordinate}
          >
            <Plus className="h-3 w-3" />
          </button>
          {onStartConnect && (
            <button
              type="button"
              onPointerDown={(e) => onStartConnect(node, e)}
              className="cursor-grab rounded-full bg-white p-1.5 text-purple-500 shadow ring-1 ring-slate-200 hover:bg-purple-50 active:cursor-grabbing"
              title={t.nodeCard.connectLine}
            >
              <Link2 className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="rounded-full bg-white p-1.5 text-slate-500 shadow ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
            title={t.nodeCard.edit}
          >
            <Pencil className="h-3 w-3" />
          </button>
          {node.parentId && onRemoveBoss && (
            <button
              type="button"
              onClick={() => onRemoveBoss(node)}
              className="rounded-full bg-white p-1.5 text-amber-600 shadow ring-1 ring-slate-200 hover:bg-amber-50"
              title={t.nodeCard.removeBoss}
            >
              <Unlink className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(node)}
            className="rounded-full bg-white p-1.5 text-rose-500 shadow ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600"
            title={t.nodeCard.delete}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
