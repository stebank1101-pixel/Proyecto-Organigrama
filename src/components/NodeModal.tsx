import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ICON_NAMES } from "../lib/icons";
import type { OrgNode, RoleType } from "../types";

interface NodeModalProps {
  open: boolean;
  initial: OrgNode | null;
  defaultParentId: string | null;
  nodes: OrgNode[];
  onClose: () => void;
  onSave: (node: OrgNode) => void;
}

function emptyNode(defaultParentId: string | null): OrgNode {
  return {
    id: "",
    name: "",
    title: "",
    department: "",
    sede: "",
    email: "",
    phone: "",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    roleType: "employee",
    parentId: defaultParentId,
    freeX: 300 + Math.random() * 300,
    freeY: 300 + Math.random() * 200,
    metrics: { headcount: 0, budget: "" },
    status: "active",
    customBadge: "",
    iconName: "User",
  };
}

function getDescendantIds(nodeId: string, nodes: OrgNode[]): Set<string> {
  const result = new Set<string>();
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const n of nodes) {
      if (n.parentId === current && !result.has(n.id)) {
        result.add(n.id);
        stack.push(n.id);
      }
    }
  }
  return result;
}

export function NodeModal({ open, initial, defaultParentId, nodes, onClose, onSave }: NodeModalProps) {
  const [form, setForm] = useState<OrgNode>(() => initial ?? emptyNode(defaultParentId));

  useEffect(() => {
    if (open) {
      setForm(initial ?? emptyNode(defaultParentId));
    }
  }, [open, initial, defaultParentId]);

  if (!open) return null;

  const blockedParentIds = initial ? getDescendantIds(initial.id, nodes) : new Set<string>();
  const parentOptions = nodes.filter((n) => n.id !== initial?.id && !blockedParentIds.has(n.id));

  function update<K extends keyof OrgNode>(key: K, value: OrgNode[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.title.trim()) return;
    const id = form.id || `node-${Date.now()}`;
    onSave({ ...form, id });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{initial ? "Editar colaborador" : "Nuevo colaborador"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre completo" required>
              <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </Field>
            <Field label="Cargo" required>
              <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Departamento">
              <input className="input" value={form.department} onChange={(e) => update("department", e.target.value)} />
            </Field>
            <Field label="Sede">
              <input className="input" value={form.sede} onChange={(e) => update("sede", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <input className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
          </div>

          <Field label="Avatar (URL)">
            <input className="input" value={form.avatar} onChange={(e) => update("avatar", e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de rol">
              <select className="input" value={form.roleType} onChange={(e) => update("roleType", e.target.value as RoleType)}>
                <option value="executive">Ejecutivo</option>
                <option value="director">Director</option>
                <option value="manager">Manager</option>
                <option value="employee">Colaborador</option>
              </select>
            </Field>
            <Field label="Icono">
              <select className="input" value={form.iconName} onChange={(e) => update("iconName", e.target.value)}>
                {ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Reporta a">
            <select
              className="input"
              value={form.parentId ?? ""}
              onChange={(e) => update("parentId", e.target.value || null)}
            >
              <option value="">— Sin superior (raíz) —</option>
              {parentOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} · {n.title}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Headcount">
              <input
                type="number"
                min={0}
                className="input"
                value={form.metrics?.headcount ?? 0}
                onChange={(e) => update("metrics", { ...form.metrics, headcount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Presupuesto">
              <input
                className="input"
                value={form.metrics?.budget ?? ""}
                onChange={(e) => update("metrics", { ...form.metrics, budget: e.target.value })}
              />
            </Field>
            <Field label="Estado">
              <select className="input" value={form.status} onChange={(e) => update("status", e.target.value as OrgNode["status"])}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Field>
          </div>

          <Field label="Distintivo (badge)">
            <input className="input" value={form.customBadge} onChange={(e) => update("customBadge", e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-400">
      {label} {required && <span className="text-rose-400">*</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
