import { Pencil, Plus, Trash2 } from "lucide-react";
import { getDepartmentStyle } from "../lib/departmentColors";
import { OrgIcon } from "../lib/icons";
import type { OrgNode } from "../types";

interface NodeCardProps {
  node: OrgNode;
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  highlighted?: boolean;
  readOnly?: boolean;
  /** Compact shows only area + cargo; the rest of the node's data still exists underneath
   * and can be revealed by switching to the detailed view (see the toolbar toggle). */
  compact?: boolean;
}

export function NodeCard({ node, onEdit, onDelete, onAddChild, dragHandleProps, highlighted, readOnly, compact }: NodeCardProps) {
  const style = getDepartmentStyle(node.department);
  const textStyle: React.CSSProperties | undefined = node.textColor ? { color: node.textColor } : undefined;
  const mutedTextStyle: React.CSSProperties | undefined = node.textColor ? { color: node.textColor, opacity: 0.75 } : undefined;
  const cardStyle: React.CSSProperties = {
    ...(node.cardColor ? { backgroundColor: node.cardColor } : {}),
    ...(node.fontFamily ? { fontFamily: node.fontFamily } : {}),
  };

  return (
    <div
      {...dragHandleProps}
      data-card="true"
      style={cardStyle}
      className={`group relative w-[240px] select-none rounded-xl border bg-white p-3 shadow-md transition-shadow ${style.ring} ${
        highlighted ? "ring-2 shadow-[0_0_0_3px_rgba(56,189,248,0.25)]" : "ring-1"
      }`}
    >
      <div
        className={`absolute -top-2.5 -left-2.5 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-white shadow ${
          node.customIcon ? "bg-white ring-1 ring-slate-200" : style.iconBg
        }`}
      >
        {node.customIcon ? (
          <img src={node.customIcon} alt="" className="h-full w-full object-cover" />
        ) : (
          <OrgIcon name={node.iconName} className="h-3.5 w-3.5" />
        )}
      </div>

      <span
        className={`absolute top-2 right-2 h-2 w-2 rounded-full ${node.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`}
        title={node.status === "active" ? "Activo" : "Inactivo"}
      />

      <div className="pt-1">
        <p className="truncate text-sm font-semibold text-slate-900" style={textStyle} title={node.title}>
          {node.title || "Cargo sin definir"}
        </p>
        <p className="truncate text-xs text-slate-500" style={mutedTextStyle} title={compact ? node.department : node.name || "Vacante"}>
          {compact ? node.department || "Área sin asignar" : node.name || "Vacante"}
        </p>
      </div>

      {!compact && (
        <p className="mt-2 truncate text-[11px] text-slate-500" style={mutedTextStyle} title={`${node.department} · ${node.sede}`}>
          {node.department} · {node.sede}
        </p>
      )}

      {!readOnly && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-3 flex justify-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onAddChild(node)}
            className="rounded-full bg-white p-1.5 text-slate-500 shadow ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
            title="Agregar subordinado"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="rounded-full bg-white p-1.5 text-slate-500 shadow ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
            title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            className="rounded-full bg-white p-1.5 text-rose-500 shadow ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600"
            title="Eliminar"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
