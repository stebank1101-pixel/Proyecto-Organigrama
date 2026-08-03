import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

export interface WorkCenterRow {
  name: string;
  count: number;
}

interface WorkCenterManagerModalProps {
  open: boolean;
  centers: WorkCenterRow[];
  onClose: () => void;
  onCreate: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
}

export function WorkCenterManagerModal({ open, centers, onClose, onCreate, onRename, onDelete }: WorkCenterManagerModalProps) {
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Centros de trabajo</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

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

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {centers.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No hay centros de trabajo todavía.</p>}
          {centers.map((c) => (
            <div key={c.name} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
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
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {c.count} {c.count === 1 ? "colaborador" : "colaboradores"}
                  </p>
                </div>
              )}
              <button
                className="icon-btn border border-slate-200"
                title="Renombrar"
                onClick={() => startEdit(c.name)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                className="icon-btn border border-slate-200 text-rose-500"
                title="Eliminar"
                onClick={() => onDelete(c.name)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
