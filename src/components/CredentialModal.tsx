import { AlertTriangle, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useT } from "../lib/i18n";
import type { PlatformCredential } from "../types";

export interface CredentialDraft {
  empresa: string;
  tipoId: string;
  usuario: string;
  clave: string;
  objetivo: string;
  link: string;
}

interface CredentialModalProps {
  open: boolean;
  credential: PlatformCredential | null;
  saving: boolean;
  error?: string | null;
  onSave: (draft: CredentialDraft) => void;
  onClose: () => void;
}

const BLANK_DRAFT: CredentialDraft = { empresa: "", tipoId: "", usuario: "", clave: "", objetivo: "", link: "" };

export function CredentialModal({ open, credential, saving, error, onSave, onClose }: CredentialModalProps) {
  const t = useT();
  const [draft, setDraft] = useState<CredentialDraft>(() => (credential ? { ...credential } : BLANK_DRAFT));
  const [openedFor, setOpenedFor] = useState(credential?.id ?? null);

  if (!open) return null;

  const currentKey = credential?.id ?? null;
  if (currentKey !== openedFor) {
    setOpenedFor(currentKey);
    setDraft(credential ? { ...credential } : BLANK_DRAFT);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed: CredentialDraft = {
      empresa: draft.empresa.trim(),
      tipoId: draft.tipoId.trim(),
      usuario: draft.usuario.trim(),
      clave: draft.clave.trim(),
      objetivo: draft.objetivo.trim(),
      link: draft.link.trim(),
    };
    if (!trimmed.empresa) return;
    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {credential ? t.credentials.editCredentialTitle : t.credentials.newCredentialTitle}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            {t.credentials.empresaLabel}
            <input
              required
              autoFocus
              className="input mt-1"
              placeholder={t.credentials.empresaPlaceholder}
              value={draft.empresa}
              onChange={(e) => setDraft((d) => ({ ...d, empresa: e.target.value }))}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-600">
              {t.credentials.tipoIdLabel}
              <input
                className="input mt-1"
                placeholder={t.credentials.tipoIdPlaceholder}
                value={draft.tipoId}
                onChange={(e) => setDraft((d) => ({ ...d, tipoId: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t.credentials.usuarioLabel}
              <input
                className="input mt-1"
                placeholder={t.credentials.usuarioPlaceholder}
                value={draft.usuario}
                onChange={(e) => setDraft((d) => ({ ...d, usuario: e.target.value }))}
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-600">
            {t.credentials.claveLabel}
            <input
              className="input mt-1"
              placeholder={t.credentials.clavePlaceholder}
              value={draft.clave}
              onChange={(e) => setDraft((d) => ({ ...d, clave: e.target.value }))}
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            {t.credentials.objetivoLabel}
            <textarea
              className="input mt-1"
              rows={2}
              placeholder={t.credentials.objetivoPlaceholder}
              value={draft.objetivo}
              onChange={(e) => setDraft((d) => ({ ...d, objetivo: e.target.value }))}
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            {t.credentials.linkLabel}
            <input
              className="input mt-1"
              placeholder={t.credentials.linkPlaceholder}
              value={draft.link}
              onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
            />
          </label>

          {error && (
            <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t.credentials.cancel}
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.credentials.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
