import { AlertTriangle, ChevronDown, ChevronRight, Pencil, Plus, Star, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useT } from "../lib/i18n";
import type { WorkCenterRow } from "../lib/workCenters";
import type { OrgNode } from "../types";

interface ProfileDraft {
  address: string;
  email: string;
  phone: string;
  headcount: string;
  budget: string;
  icon: string;
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
  onUpdateProfile: (
    name: string,
    profile: { address: string; email: string; phone: string; headcount: number; budget: string; icon: string }
  ) => void;
  onSetDefault: (name: string, isDefault: boolean) => void;
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
  onSetDefault,
  onEditNode,
  onCreateNode,
  onDeleteNode,
}: WorkCenterManagerModalProps) {
  const t = useT();
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleIconFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileDraft((d) => (d ? { ...d, icon: reader.result as string } : d));
    reader.readAsDataURL(file);
  }

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
      icon: c.icon,
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
      icon: profileDraft.icon,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{t.workCenterManager.title}</h2>
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
              placeholder={t.workCenterManager.newCenterPlaceholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              <Plus className="h-3.5 w-3.5" /> {t.workCenterManager.addButton}
            </button>
          </form>
        )}

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {centers.length === 0 && <p className="py-4 text-center text-sm text-slate-400">{t.workCenterManager.noCenters}</p>}
          {centers.map((c) => {
            const isExpanded = expandedName === c.name;
            const centerNodes = nodes.filter((n) => n.sede === c.name);
            return (
              <div key={c.name} className="rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => toggleExpand(c)}
                    title={isExpanded ? t.workCenterManager.collapse : t.workCenterManager.expand}
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
                      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                        {c.name}
                        {c.isDefault && (
                          <span
                            className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                            title={t.workCenterManager.isDefaultBadge}
                          >
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> {t.workCenterManager.defaultLabel}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">{t.common.collaboratorCount(c.count)}</p>
                    </button>
                  )}

                  {!readOnly && (
                    <>
                      <button
                        className={`icon-btn border ${
                          c.isDefault ? "border-amber-300 bg-amber-50 text-amber-500" : "border-slate-200 text-slate-300 hover:text-amber-400"
                        }`}
                        title={c.isDefault ? t.workCenterManager.unsetDefault : t.workCenterManager.setDefault}
                        onClick={() => onSetDefault(c.name, !c.isDefault)}
                      >
                        <Star className={`h-3.5 w-3.5 ${c.isDefault ? "fill-amber-500" : ""}`} />
                      </button>
                      <button className="icon-btn border border-slate-200" title={t.workCenterManager.rename} onClick={() => startEdit(c.name)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="icon-btn border border-slate-200 text-rose-500"
                        title={t.workCenterManager.delete}
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
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.workCenterManager.centerCardTitle}</p>

                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                          {profileDraft?.icon ? (
                            <img src={profileDraft.icon} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-slate-300">{t.workCenterManager.noIcon}</span>
                          )}
                        </div>
                        {!readOnly && (
                          <>
                            <input
                              className="input flex-1"
                              placeholder={t.workCenterManager.imageUrlPlaceholder}
                              value={profileDraft?.icon ?? ""}
                              onChange={(e) => setProfileDraft((d) => (d ? { ...d, icon: e.target.value } : d))}
                            />
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleIconFile(e.target.files?.[0])}
                            />
                            <button
                              type="button"
                              className="icon-btn flex-shrink-0 border border-slate-200"
                              title={t.workCenterManager.uploadFromPc}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                            {profileDraft?.icon && (
                              <button
                                type="button"
                                className="flex-shrink-0 text-[11px] text-rose-500 hover:underline"
                                onClick={() => setProfileDraft((d) => (d ? { ...d, icon: "" } : d))}
                              >
                                {t.workCenterManager.remove}
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="input"
                          placeholder={t.workCenterManager.addressPlaceholder}
                          disabled={readOnly}
                          value={profileDraft?.address ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, address: e.target.value } : d))}
                        />
                        <input
                          className="input"
                          placeholder={t.workCenterManager.emailPlaceholder}
                          disabled={readOnly}
                          value={profileDraft?.email ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, email: e.target.value } : d))}
                        />
                        <input
                          className="input"
                          placeholder={t.workCenterManager.phonePlaceholder}
                          disabled={readOnly}
                          value={profileDraft?.phone ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, phone: e.target.value } : d))}
                        />
                        <input
                          className="input"
                          type="number"
                          min={0}
                          placeholder={t.workCenterManager.headcountPlaceholder}
                          disabled={readOnly}
                          value={profileDraft?.headcount ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, headcount: e.target.value } : d))}
                        />
                        <input
                          className="input col-span-2"
                          placeholder={t.workCenterManager.budgetPlaceholder}
                          disabled={readOnly}
                          value={profileDraft?.budget ?? ""}
                          onChange={(e) => setProfileDraft((d) => (d ? { ...d, budget: e.target.value } : d))}
                        />
                      </div>
                      {!readOnly && (
                        <button className="btn-secondary mt-2" onClick={() => saveProfile(c.name)}>
                          {t.workCenterManager.saveProfile}
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.workCenterManager.collaboratorsTitle}</p>
                        {!readOnly && (
                          <button
                            className="flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:underline"
                            onClick={() => onCreateNode(c.name)}
                          >
                            <Plus className="h-3 w-3" /> {t.workCenterManager.add}
                          </button>
                        )}
                      </div>
                      {centerNodes.length === 0 ? (
                        <p className="text-[11px] text-slate-400">{t.workCenterManager.noCollaborators}</p>
                      ) : (
                        <div className="space-y-1">
                          {centerNodes.map((n) => (
                            <div key={n.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-slate-800">{n.title}</p>
                                <p className="truncate text-[11px] text-slate-400">{n.name || t.workCenterManager.vacancy}</p>
                              </div>
                              {!readOnly && (
                                <>
                                  <button className="icon-btn border border-slate-200" title={t.common.edit} onClick={() => onEditNode(n)}>
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    className="icon-btn border border-slate-200 text-rose-500"
                                    title={t.workCenterManager.delete}
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
