import { AlertTriangle, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useT } from "../lib/i18n";
import type { DirectoryContact } from "../types";

export interface DirectoryContactDraft {
  sede: string;
  area: string;
  name: string;
  phone: string;
  email: string;
}

interface DirectoryContactModalProps {
  open: boolean;
  contact: DirectoryContact | null;
  sedeOptions: string[];
  saving: boolean;
  error?: string | null;
  onSave: (draft: DirectoryContactDraft) => void;
  onClose: () => void;
}

const BLANK_DRAFT: DirectoryContactDraft = { sede: "", area: "", name: "", phone: "", email: "" };

export function DirectoryContactModal({ open, contact, sedeOptions, saving, error, onSave, onClose }: DirectoryContactModalProps) {
  const t = useT();
  const [draft, setDraft] = useState<DirectoryContactDraft>(() =>
    contact ? { sede: contact.sede, area: contact.area, name: contact.name, phone: contact.phone, email: contact.email } : BLANK_DRAFT
  );
  const [openedFor, setOpenedFor] = useState(contact?.id ?? null);

  if (!open) return null;

  // Re-seeds the draft whenever the modal is opened for a different contact (or a fresh
  // "new contact" after a previous edit), without wiping user input on every re-render.
  const currentKey = contact?.id ?? null;
  if (currentKey !== openedFor) {
    setOpenedFor(currentKey);
    setDraft(
      contact ? { sede: contact.sede, area: contact.area, name: contact.name, phone: contact.phone, email: contact.email } : BLANK_DRAFT
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed: DirectoryContactDraft = {
      sede: draft.sede.trim(),
      area: draft.area.trim(),
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
    };
    if (!trimmed.sede || !trimmed.name) return;
    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{contact ? t.directory.editContactTitle : t.directory.newContactTitle}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            {t.directory.sedeLabel}
            <input
              required
              autoFocus
              list="directory-sede-options"
              className="input mt-1"
              placeholder={t.directory.sedePlaceholder}
              value={draft.sede}
              onChange={(e) => setDraft((d) => ({ ...d, sede: e.target.value }))}
            />
            <datalist id="directory-sede-options">
              {sedeOptions.map((sede) => (
                <option key={sede} value={sede} />
              ))}
            </datalist>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            {t.directory.areaLabel}
            <input
              className="input mt-1"
              placeholder={t.directory.areaPlaceholder}
              value={draft.area}
              onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            {t.directory.nameLabel}
            <input
              required
              className="input mt-1"
              placeholder={t.directory.namePlaceholder}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-600">
              {t.directory.phoneLabel}
              <input
                className="input mt-1"
                placeholder={t.directory.phonePlaceholder}
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t.directory.emailLabel}
              <input
                type="email"
                className="input mt-1"
                placeholder={t.directory.emailPlaceholder}
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </label>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t.directory.cancel}
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.directory.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
