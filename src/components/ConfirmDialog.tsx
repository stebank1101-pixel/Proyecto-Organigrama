import { useT } from "../lib/i18n";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const t = useT();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">
            {t.confirmDialog.cancel}
          </button>
          <button
            onClick={onConfirm}
            className={danger ? "btn-primary bg-rose-600 hover:bg-rose-500" : "btn-primary"}
          >
            {confirmLabel ?? t.confirmDialog.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
