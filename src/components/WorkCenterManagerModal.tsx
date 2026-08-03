import { AlertTriangle, ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { OrgNode } from "../types";

export interface WorkCenterRow {
  name: string;
  count: number;
  address: string;
  email: string;
  phone: string;
  headcount: number;
  budget: string;
}

interface ProfileDraft {
  address: string;
  email: string;
  phone: string;
  headcount: string;
  budget: string;
}

interface WorkCenterManagerModalProps {
  open: boolean;
  centers: WorkCenterRow[];
  nodes: OrgNode[];
  error?: string | null;
  readOnly?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
  onUpdateProfile: (name: string, profile: { address: string; email: string; phone: string; headcount: number; budget: string }) => void;
  onEditNode: (node: OrgNode) => void;
  onCreateNode: (sedeName: string) => void;
  onDeleteNode: (node: OrgNode) => void;
}

export function WorkCenterManagerModal({
  open,
  centers,
  nodes,
  error,
  readOnly,
  onClose,
  onCreate,
  onRename,
  onDelete,
  onUpdateProfile,
  onEditNode,
  onCreateNode,
  onDeleteNode,
}: WorkCenterManagerModalProps) {
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);

  if (!open) return null;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewName("");
  }

  function startEdit(name: string) {
    setEditingName(name);
    setEditingValue(name);
  }

  function confirmEdit() {
    const trimmed = editingValue.trim();
    if (editingName && trimmed && trimmed !== editingName) {
      onRename(editingName, trimmed);
    }
    setEditingName(null);
    setEditingValue("");
  }

  function toggleExpand(c: WorkCenterRow) {
    if (expandedName === c.name) {
      setExpandedName(null);
      setProfileDraft(null);
      return;
    }
    setExpandedName(c.name);
    setProfileDraft({
      address: c.address,
      email: c.email,
      phone: c.phone,
      headcount: c.headcount ? String(c.headcount) : "",
      budget: c.budget,
    });
  }

  function saveProfile(name: string) {
    if (!profileDraft) return;
    onUpdateProfile(name, {
      address: profileDraft.address,
      email: profileDraft.email,
      phone: profileDraft.phone,
      headcount: Number(profileDraft.headcount) || 0,
      budget: profileDraft.budget,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Centros de trabajo</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </p>
        )}

        {!readOnly && (
          <form onSubmit={handleCreate} className="mb-4 flex gap-2">
            <input
              className="input flex-1"
              placeholder="Nombre del nuevo centro de trabajo..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              <Plus className="h-3.5 w-3.5" /> Añadir
            </button>
          </form>
        )}

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {centers.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No hay centros de trabajo todavía.</p>}
          {centers.map((c) => {
            const isExpanded = expandedName === c.name;
            const centerNodes = nodes.filter((n) => n.sede === c.name);
            return (
              <div key={c.name} className="rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => toggleExpand(c)}
                    title={isExpanded ? "Contraer" : "Ver detalle y colaboradores"}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  {editingName === c.name ? (
                    <input
                      autoFocus
                      className="input flex-1"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmEdit();
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      onBlur={confirmEdit}
                    />
                  ) : (
                    <button className="flex-1 text-left" onClick={() => toggleExpand(c)}>
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {c.count} {c.count === 1 ? "colaborador" : "colaboradores"}
                      </p>
                    </button>
                  )}

                  {!readOnly && (
                    <>
                      <button className="icon-btn border border-slate-200" title="Renombrar" onClick={() => startEdit(c.name)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="icon-btn border border-slate-200 text-rose-500"
                        title="Eliminar"
                        onClick={() => onDelete(c.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-slate-100 bg-slate-50 p-3">
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ficha del centro</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="input"
                          placeholder="Dirección"
                          disabled={readOnly}
                          value={profileDraft?.address ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, address: e.target.value } : d))}
                        />
                        <input
                          className="input"
                          placeholder="Email de contacto"
                          disabled={readOnly}
                          value={profileDraft?.email ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, email: e.target.value } : d))}
                        />
                        <input
                          className="input"
                          placeholder="Teléfono"
                          disabled={readOnly}
                          value={profileDraft?.phone ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, phone: e.target.value } : d))}
                        />
                        <input
                          className="input"
                          type="number"
                          min={0}
                          placeholder="Headcount"
                          disabled={readOnly}
                          value={profileDraft?.headcount ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, headcount: e.target.value } : d))}
                        />
                        <input
                          className="input col-span-2"
                          placeholder="Presupuesto"
                          disabled={readOnly}
                          value={profileDraft?.budget ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, budget: e.target.value } : d))}
                        />
                      </div>
                      {!readOnly && (
                        <button className="btn-secondary mt-2" onClick={() => saveProfile(c.name)}>
                          Guardar ficha
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Colaboradores</p>
                        {!readOnly && (
                          <button
                            className="flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:underline"
                            onClick={() => onCreateNode(c.name)}
                          >
                            <Plus className="h-3 w-3" /> Agregar
                          </button>
                        )}
                      </div>
                      {centerNodes.length === 0 ? (
                        <p className="text-[11px] text-slate-400">Sin colaboradores en este centro.</p>
                      ) : (
                        <div className="space-y-1">
                          {centerNodes.map((n) => (
                            <div key={n.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-slate-800">{n.title}</p>
                                <p className="truncate text-[11px] text-slate-400">{n.name || "Vacante"}</p>
                              </div>
                              {!readOnly && (
                                <>
                                  <button className="icon-btn border border-slate-200" title="Editar" onClick={() => onEditNode(n)}>
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    className="icon-btn border border-slate-200 text-rose-500"
                                    title="Eliminar"
                                    onClick={() => onDeleteNode(n)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
