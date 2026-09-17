import { AlertTriangle, Loader2, Mail, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createDirectoryContactApi,
  deleteDirectoryContactApi,
  fetchDirectoryContacts,
  translateApiError,
  updateDirectoryContactApi,
} from "../lib/api";
import { useT } from "../lib/i18n";
import type { DirectoryContact, WorkCenter } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { DirectoryContactModal, type DirectoryContactDraft } from "./DirectoryContactModal";

interface DirectoryViewProps {
  workCenters: WorkCenter[];
  readOnly?: boolean;
}

export function DirectoryView({ workCenters, readOnly }: DirectoryViewProps) {
  const t = useT();
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sedeFilter, setSedeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<DirectoryContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectoryContact | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchDirectoryContacts();
      setContacts(res.data);
    } catch (err) {
      setLoadError(translateApiError(err, t, t.directory.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sedeOptions = useMemo(() => {
    const names = new Set<string>([...contacts.map((c) => c.sede), ...workCenters.map((c) => c.name)]);
    names.delete("");
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [contacts, workCenters]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = contacts.filter((c) => {
      if (sedeFilter !== "all" && c.sede !== sedeFilter) return false;
      if (!query) return true;
      return [c.sede, c.area, c.name, c.phone, c.email].some((field) => field.toLowerCase().includes(query));
    });

    const bySede = new Map<string, DirectoryContact[]>();
    for (const contact of filtered) {
      const key = contact.sede || "";
      if (!bySede.has(key)) bySede.set(key, []);
      bySede.get(key)!.push(contact);
    }
    for (const list of bySede.values()) {
      list.sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name));
    }
    return Array.from(bySede.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [contacts, search, sedeFilter]);

  const totalCount = filteredGroups.reduce((sum, [, list]) => sum + list.length, 0);

  function openCreateModal() {
    setEditingContact(null);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEditModal(contact: DirectoryContact) {
    setEditingContact(contact);
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave(draft: DirectoryContactDraft) {
    setSaving(true);
    setSaveError(null);
    try {
      if (editingContact) {
        await updateDirectoryContactApi(editingContact.id, draft);
        setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? { ...c, ...draft } : c)));
      } else {
        const res = await createDirectoryContactApi(draft);
        setContacts((prev) => [...prev, res.data]);
      }
      setModalOpen(false);
      setEditingContact(null);
    } catch (err) {
      setSaveError(translateApiError(err, t, editingContact ? t.directory.updateError : t.directory.createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setActionError(null);
    try {
      await deleteDirectoryContactApi(target.id);
      setContacts((prev) => prev.filter((c) => c.id !== target.id));
    } catch (err) {
      setActionError(translateApiError(err, t, t.directory.deleteError));
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{t.directory.title}</h1>
        <p className="mt-1 text-xs text-slate-500">{t.directory.description}</p>
        {readOnly && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {t.directory.readOnlyNotice}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-8"
            placeholder={t.directory.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select-sm" value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)}>
          <option value="all">{t.directory.allSedesOption}</option>
          {sedeOptions.map((sede) => (
            <option key={sede} value={sede}>
              {sede}
            </option>
          ))}
        </select>
        {!readOnly && (
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus className="h-3.5 w-3.5" /> {t.directory.addContact}
          </button>
        )}
        <span className="ml-auto text-[11px] text-slate-400">{t.directory.contactCount(totalCount)}</span>
      </div>

      {actionError && (
        <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t.directory.loading}
        </div>
      ) : loadError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm">{loadError}</p>
          <button className="btn-secondary" onClick={refresh}>
            {t.common.retry}
          </button>
        </div>
      ) : totalCount === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {contacts.length === 0 ? t.directory.noContacts : t.directory.noContactsFiltered}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filteredGroups.map(([sede, list]) => (
            <div key={sede || "__none__"} className="border-b border-slate-100 last:border-b-0">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{sede || t.directory.noValue}</div>
              <table className="w-full text-left text-xs">
                <thead className="sr-only">
                  <tr>
                    <th>{t.directory.areaColumn}</th>
                    <th>{t.directory.nameColumn}</th>
                    <th>{t.directory.phoneColumn}</th>
                    <th>{t.directory.emailColumn}</th>
                    {!readOnly && <th>{t.directory.actionsColumn}</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((contact) => (
                    <tr key={contact.id} className="border-t border-slate-100 first:border-t-0 hover:bg-slate-50/70">
                      <td className="w-1/4 px-4 py-2 align-top text-slate-500">{contact.area || t.directory.noValue}</td>
                      <td className="px-4 py-2 align-top font-medium text-slate-800">{contact.name}</td>
                      <td className="px-4 py-2 align-top text-slate-600">
                        {contact.phone ? (
                          <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="flex items-center gap-1 hover:text-sky-600 hover:underline">
                            <Phone className="h-3 w-3 flex-shrink-0" /> {contact.phone}
                          </a>
                        ) : (
                          t.directory.noValue
                        )}
                      </td>
                      <td className="px-4 py-2 align-top text-slate-600">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 truncate hover:text-sky-600 hover:underline">
                            <Mail className="h-3 w-3 flex-shrink-0" /> {contact.email}
                          </a>
                        ) : (
                          t.directory.noValue
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-4 py-2 align-top">
                          <div className="flex items-center gap-1">
                            <button className="icon-btn border border-slate-200" title={t.common.edit} onClick={() => openEditModal(contact)}>
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              className="icon-btn border border-slate-200 text-rose-500"
                              title={t.directory.deleteTitle}
                              onClick={() => setDeleteTarget(contact)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <DirectoryContactModal
        open={modalOpen}
        contact={editingContact}
        sedeOptions={sedeOptions}
        saving={saving}
        error={saveError}
        onSave={handleSave}
        onClose={() => {
          setModalOpen(false);
          setEditingContact(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t.directory.deleteTitle}
        description={deleteTarget ? t.directory.deleteConfirm(deleteTarget.name) : ""}
        confirmLabel={t.common.delete}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
