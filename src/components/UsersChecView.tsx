import { AlertTriangle, Check, Copy, ExternalLink, Eye, EyeOff, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createCredentialApi,
  deleteCredentialApi,
  fetchCredentials,
  translateApiError,
  updateCredentialApi,
} from "../lib/api";
import { useT } from "../lib/i18n";
import type { PlatformCredential } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { CredentialModal, type CredentialDraft } from "./CredentialModal";

interface UsersChecViewProps {
  readOnly?: boolean;
}

export function UsersChecView({ readOnly }: UsersChecViewProps) {
  const t = useT();
  const [credentials, setCredentials] = useState<PlatformCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<PlatformCredential | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformCredential | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchCredentials();
      setCredentials(res.data);
    } catch (err) {
      setLoadError(translateApiError(err, t, t.credentials.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return credentials;
    return credentials.filter((c) => [c.empresa, c.usuario, c.objetivo, c.tipoId].some((field) => field.toLowerCase().includes(query)));
  }, [credentials, search]);

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyClave(credential: PlatformCredential) {
    if (!credential.clave) return;
    try {
      await navigator.clipboard.writeText(credential.clave);
      setCopiedId(credential.id);
      setTimeout(() => setCopiedId((current) => (current === credential.id ? null : current)), 1500);
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions) — silently ignore.
    }
  }

  function openCreateModal() {
    setEditingCredential(null);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEditModal(credential: PlatformCredential) {
    setEditingCredential(credential);
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave(draft: CredentialDraft) {
    setSaving(true);
    setSaveError(null);
    try {
      if (editingCredential) {
        await updateCredentialApi(editingCredential.id, draft);
        setCredentials((prev) => prev.map((c) => (c.id === editingCredential.id ? { ...c, ...draft } : c)));
      } else {
        const res = await createCredentialApi(draft);
        setCredentials((prev) => [...prev, res.data]);
      }
      setModalOpen(false);
      setEditingCredential(null);
    } catch (err) {
      setSaveError(translateApiError(err, t, editingCredential ? t.credentials.updateError : t.credentials.createError));
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
      await deleteCredentialApi(target.id);
      setCredentials((prev) => prev.filter((c) => c.id !== target.id));
    } catch (err) {
      setActionError(translateApiError(err, t, t.credentials.deleteError));
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{t.credentials.title}</h1>
        <p className="mt-1 text-xs text-slate-500">{t.credentials.description}</p>
        {readOnly && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {t.credentials.readOnlyNotice}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-8"
            placeholder={t.credentials.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!readOnly && (
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus className="h-3.5 w-3.5" /> {t.credentials.addCredential}
          </button>
        )}
        <span className="ml-auto text-[11px] text-slate-400">{t.credentials.credentialCount(filtered.length)}</span>
      </div>

      {actionError && (
        <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t.credentials.loading}
        </div>
      ) : loadError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
          <p className="text-sm">{loadError}</p>
          <button className="btn-secondary" onClick={refresh}>
            {t.common.retry}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {credentials.length === 0 ? t.credentials.noCredentials : t.credentials.noCredentialsFiltered}
        </p>
      ) : (
        <div className="flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-semibold">{t.credentials.empresaColumn}</th>
                <th className="px-4 py-2 font-semibold">{t.credentials.usuarioColumn}</th>
                <th className="px-4 py-2 font-semibold">{t.credentials.claveColumn}</th>
                <th className="px-4 py-2 font-semibold">{t.credentials.objetivoColumn}</th>
                <th className="px-4 py-2 font-semibold">{t.credentials.linkColumn}</th>
                {!readOnly && <th className="px-4 py-2 font-semibold">{t.credentials.actionsColumn}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((credential) => {
                const revealed = revealedIds.has(credential.id);
                const isValidLink = /^https?:\/\//i.test(credential.link);
                return (
                  <tr key={credential.id} className="border-t border-slate-100 first:border-t-0 hover:bg-slate-50/70">
                    <td className="px-4 py-2 align-top font-medium text-slate-800">{credential.empresa}</td>
                    <td className="px-4 py-2 align-top text-slate-600">
                      {credential.tipoId && <span className="text-slate-400">{credential.tipoId} · </span>}
                      {credential.usuario || t.credentials.noValue}
                    </td>
                    <td className="px-4 py-2 align-top text-slate-600">
                      {credential.clave ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono">{revealed ? credential.clave : "••••••••"}</span>
                          <button
                            type="button"
                            className="icon-btn"
                            title={revealed ? t.credentials.hideClave : t.credentials.showClave}
                            onClick={() => toggleReveal(credential.id)}
                          >
                            {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            title={copiedId === credential.id ? t.credentials.copied : t.credentials.copyClave}
                            onClick={() => copyClave(credential)}
                          >
                            {copiedId === credential.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      ) : (
                        t.credentials.noValue
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-2 align-top text-slate-600">{credential.objetivo || t.credentials.noValue}</td>
                    <td className="px-4 py-2 align-top">
                      {credential.link ? (
                        isValidLink ? (
                          <a
                            href={credential.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sky-600 hover:underline"
                            title={t.credentials.openLink}
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" /> {t.credentials.openLink}
                          </a>
                        ) : (
                          <span className="text-slate-500">{credential.link}</span>
                        )
                      ) : (
                        t.credentials.noValue
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-2 align-top">
                        <div className="flex items-center gap-1">
                          <button className="icon-btn border border-slate-200" title={t.common.edit} onClick={() => openEditModal(credential)}>
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            className="icon-btn border border-slate-200 text-rose-500"
                            title={t.credentials.deleteTitle}
                            onClick={() => setDeleteTarget(credential)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CredentialModal
        open={modalOpen}
        credential={editingCredential}
        saving={saving}
        error={saveError}
        onSave={handleSave}
        onClose={() => {
          setModalOpen(false);
          setEditingCredential(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t.credentials.deleteTitle}
        description={deleteTarget ? t.credentials.deleteConfirm(deleteTarget.empresa) : ""}
        confirmLabel={t.common.delete}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
