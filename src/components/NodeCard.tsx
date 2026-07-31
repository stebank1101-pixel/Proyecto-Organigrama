import { Mail, Pencil, Phone, Plus, Trash2, Users2 } from "lucide-react";
import { OrgIcon } from "../lib/icons";
import type { OrgNode } from "../types";

const ROLE_STYLES: Record<OrgNode["roleType"], { ring: string; badge: string; iconBg: string }> = {
  executive: {
    ring: "ring-amber-400/70 border-amber-400/60",
    badge: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    iconBg: "bg-amber-500",
  },
  director: {
    ring: "ring-sky-400/60 border-sky-400/50",
    badge: "bg-sky-500/15 text-sky-300 border-sky-400/30",
    iconBg: "bg-sky-500",
  },
  manager: {
    ring: "ring-emerald-400/60 border-emerald-400/50",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    iconBg: "bg-emerald-500",
  },
  employee: {
    ring: "ring-slate-400/50 border-slate-400/40",
    badge: "bg-slate-500/15 text-slate-300 border-slate-400/30",
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
}

export function NodeCard({ node, onEdit, onDelete, onAddChild, dragHandleProps, highlighted }: NodeCardProps) {
  const style = ROLE_STYLES[node.roleType];

  return (
    <div
      {...dragHandleProps}
      className={`group relative w-[240px] select-none rounded-xl border bg-slate-900/90 p-3 shadow-lg backdrop-blur transition-shadow ${style.ring} ${
        highlighted ? "ring-2 shadow-[0_0_0_3px_rgba(56,189,248,0.35)]" : "ring-1"
      }`}
    >
      <div className={`absolute -top-2.5 -left-2.5 flex h-7 w-7 items-center justify-center rounded-full text-white shadow ${style.iconBg}`}>
        <OrgIcon name={node.iconName} className="h-3.5 w-3.5" />
      </div>

      <span
        className={`absolute top-2 right-2 h-2 w-2 rounded-full ${node.status === "active" ? "bg-emerald-400" : "bg-slate-500"}`}
        title={node.status === "active" ? "Activo" : "Inactivo"}
      />

      <div className="flex items-start gap-2.5 pt-1">
        <img
          src={node.avatar}
          alt={node.name}
          className="h-11 w-11 flex-shrink-0 rounded-full border border-white/10 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://api.dicebear.com/9.x/initials/svg?seed=" + encodeURIComponent(node.name);
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100" title={node.name}>
            {node.name}
          </p>
          <p className="truncate text-xs text-slate-400" title={node.title}>
            {node.title}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${style.badge}`}>{ROLE_LABEL[node.roleType]}</span>
        {node.customBadge && (
          <span className="truncate rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">
            {node.customBadge}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-0.5 text-[11px] text-slate-400">
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

      <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-slate-300">
        <span className="flex items-center gap-1">
          <Users2 className="h-3 w-3" />
          {node.metrics?.headcount ?? 0}
        </span>
        <span>{node.metrics?.budget}</span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 -bottom-3 flex justify-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onAddChild(node)}
          className="rounded-full bg-slate-800 p-1.5 text-slate-300 shadow ring-1 ring-white/10 hover:bg-slate-700 hover:text-white"
          title="Agregar subordinado"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onEdit(node)}
          className="rounded-full bg-slate-800 p-1.5 text-slate-300 shadow ring-1 ring-white/10 hover:bg-slate-700 hover:text-white"
          title="Editar"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(node)}
          className="rounded-full bg-slate-800 p-1.5 text-rose-300 shadow ring-1 ring-white/10 hover:bg-rose-600 hover:text-white"
          title="Eliminar"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
