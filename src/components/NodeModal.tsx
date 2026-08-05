import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { ICON_LABELS, ICON_NAMES, OrgIcon } from "../lib/icons";
import { CARD_COLOR_PRESETS, FONT_OPTIONS } from "../types";
import type { Assignee, OrgNode, RoleType } from "../types";

const DEFAULT_ASSIGNEE_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";

interface NodeModalProps {
  open: boolean;
  initial: OrgNode | null;
  defaultParentId: string | null;
  defaultSede?: string;
  nodes: OrgNode[];
  sedeOptions?: string[];
  onClose: () => void;
  onSave: (node: OrgNode) => void;
}

function emptyNode(defaultParentId: string | null, defaultSede?: string): OrgNode {
  return {
    id: "",
    name: "",
    title: "",
    assignees: [],
    department: "",
    sede: defaultSede ?? "",
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

export function NodeModal({ open, initial, defaultParentId, defaultSede, nodes, sedeOptions, onClose, onSave }: NodeModalProps) {
  const [form, setForm] = useState<OrgNode>(() => initial ?? emptyNode(defaultParentId, defaultSede));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initial ?? emptyNode(defaultParentId, defaultSede));
    }
  }, [open, initial, defaultParentId, defaultSede]);

  if (!open) return null;

  const blockedParentIds = initial ? getDescendantIds(initial.id, nodes) : new Set<string>();
  const parentOptions = form.sede
    ? nodes.filter((n) => n.id !== initial?.id && n.sede === form.sede && !blockedParentIds.has(n.id))
    : [];

  function update<K extends keyof OrgNode>(key: K, value: OrgNode[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const id = form.id || `node-${Date.now()}`;
    onSave({ ...form, id });
  }

  function handleIconFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("customIcon", reader.result as string);
    reader.readAsDataURL(file);
  }

  function addAssignee() {
    const assignee: Assignee = { id: `assignee-${Date.now()}`, name: "", avatar: DEFAULT_ASSIGNEE_AVATAR };
    update("assignees", [...(form.assignees ?? []), assignee]);
  }

  function updateAssignee(id: string, patch: Partial<Assignee>) {
    update(
      "assignees",
      (form.assignees ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  }

  function removeAssignee(id: string) {
    update("assignees", (form.assignees ?? []).filter((a) => a.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{initial ? "Editar cargo" : "Nuevo cargo"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo" required>
              <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} required autoFocus />
            </Field>
            <Field label="Nombre completo">
              <input
                className="input"
                placeholder="Vacante"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Departamento">
              <input className="input" value={form.department} onChange={(e) => update("department", e.target.value)} />
            </Field>
            <Field label="Sede">
              <select
                className="input"
                value={form.sede}
                onChange={(e) => {
                  const newSede = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    sede: newSede,
                    // A parent from the previous center is no longer valid once the sede changes.
                    parentId: nodes.some((n) => n.id === prev.parentId && n.sede === newSede) ? prev.parentId : null,
                  }));
                }}
              >
                <option value="">— Sin centro —</option>
                {(sedeOptions ?? []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
                    {ICON_LABELS[name] || name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">Apariencia del recuadro</p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Color de fondo">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    value={form.cardColor || "#ffffff"}
                    onChange={(e) => update("cardColor", e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1">
                    {CARD_COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => update("cardColor", color)}
                        className="h-5 w-5 rounded-full border border-slate-300"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </Field>
              <Field label="Color de texto">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    value={form.textColor || "#0f172a"}
                    onChange={(e) => update("textColor", e.target.value)}
                  />
                  <button type="button" className="text-[11px] text-sky-600 hover:underline" onClick={() => update("textColor", "")}>
                    Restablecer
                  </button>
                </div>
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Tipo de letra">
                <select className="input" value={form.fontFamily || ""} onChange={(e) => update("fontFamily", e.target.value)}>
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.label} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Icono / logo corporativo">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                    {form.customIcon ? (
                      <img src={form.customIcon} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <OrgIcon name={form.iconName} className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <input
                    className="input flex-1"
                    placeholder="URL de imagen (https://...)"
                    value={form.customIcon || ""}
                    onChange={(e) => update("customIcon", e.target.value)}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleIconFile(e.target.files?.[0])}
                  />
                  <button type="button" className="icon-btn border border-slate-200" title="Subir imagen" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  {form.customIcon && (
                    <button type="button" className="text-[11px] text-rose-500 hover:underline" onClick={() => update("customIcon", "")}>
                      Quitar
                    </button>
                  )}
                </div>
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Personas asignadas al cargo</p>
              <button type="button" onClick={addAssignee} className="flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:underline">
                <Plus className="h-3 w-3" /> Agregar persona
              </button>
            </div>

            {(form.assignees ?? []).length === 0 ? (
              <p className="text-[11px] text-slate-400">Sin personas asignadas. El cargo aparecerá como vacante.</p>
            ) : (
              <div className="space-y-2">
                {(form.assignees ?? []).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                    <img src={a.avatar || DEFAULT_ASSIGNEE_AVATAR} alt="" className="h-8 w-8 flex-shrink-0 rounded-full border border-slate-200 object-cover" />
                    <input
                      className="input flex-1"
                      placeholder="Nombre de la persona"
                      value={a.name}
                      onChange={(e) => updateAssignee(a.id, { name: e.target.value })}
                    />
                    <input
                      className="input flex-1"
                      placeholder="URL de avatar"
                      value={a.avatar}
                      onChange={(e) => updateAssignee(a.id, { avatar: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeAssignee(a.id)}
                      className="icon-btn flex-shrink-0 border border-slate-200 text-rose-500 hover:bg-rose-50"
                      title="Quitar persona"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Reporta a">
            <select
              className="input"
              value={form.parentId ?? ""}
              onChange={(e) => update("parentId", e.target.value || null)}
              disabled={!form.sede}
            >
              <option value="">— Sin superior (raíz) —</option>
              {parentOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name ? `${n.name} · ${n.title}` : n.title}
                </option>
              ))}
            </select>
            {!form.sede && <p className="mt-1 text-[11px] text-slate-400">Elige una sede para poder asignar un superior.</p>}
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
    <label className="block text-xs font-medium text-slate-600">
      {label} {required && <span className="text-rose-500">*</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
