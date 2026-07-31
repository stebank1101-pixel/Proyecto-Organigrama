import { Mail, Pencil, Phone, Plus, Trash2, Users2 } from "lucide-react";
import { OrgIcon } from "../lib/icons";
import type { OrgNode } from "../types";

const ROLE_STYLES: Record<OrgNode["roleType"], { ring: string; badge: string; iconBg: string }> = {
  executive: {
    ring: "ring-amber-300 border-amber-300",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-500",
  },
  director: {
    ring: "ring-sky-300 border-sky-300",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    iconBg: "bg-sky-500",
  },
  manager: {
    ring: "ring-emerald-300 border-emerald-300",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-500",
  },
  employee: {
    ring: "ring-slate-300 border-slate-300",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    iconBg: "bg-slate-500",
  },
};

const ROLE_LABEL: Record<OrgNode["roleType"], string> = {
  executive: "Ejecutivo",
  director: "Director",
  manager: "Manager",
  employee: "Colaborador",
};

interface NodeCardProps {
  node: OrgNode;
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  highlighted?: boolean;
  readOnly?: boolean;
}

export function NodeCard({ node, onEdit, onDelete, onAddChild, dragHandleProps, highlighted, readOnly }: NodeCardProps) {
  const style = ROLE_STYLES[node.roleType];
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

      <div className="flex items-start gap-2.5 pt-1">
        <img
          src={node.avatar}
          alt={node.name}
          className="h-11 w-11 flex-shrink-0 rounded-full border border-slate-200 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://api.dicebear.com/9.x/initials/svg?seed=" + encodeURIComponent(node.name);
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900" style={textStyle} title={node.name}>
            {node.name}
          </p>
          <p className="truncate text-xs text-slate-500" style={mutedTextStyle} title={node.title}>
            {node.title}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${style.badge}`}>{ROLE_LABEL[node.roleType]}</span>
        {node.customBadge && (
          <span className="truncate rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
            {node.customBadge}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-0.5 text-[11px] text-slate-500" style={mutedTextStyle}>
        <p className="truncate">{node.department} · {node.sede}</p>
        <p className="flex items-center gap-1 truncate">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{node.email}</span>
        </p>
        <p className="flex items-center gap-1">
          <Phone className="h-3 w-3 flex-shrink-0" />
          {node.phone}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-600" style={mutedTextStyle}>
        <span className="flex items-center gap-1">
          <Users2 className="h-3 w-3" />
          {node.metrics?.headcount ?? 0}
        </span>
        <span>{node.metrics?.budget}</span>
      </div>

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
