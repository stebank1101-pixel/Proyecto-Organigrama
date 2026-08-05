import { AlertTriangle, Building2, Eye, Settings } from "lucide-react";
import { useT } from "../lib/i18n";
import type { WorkCenterRow } from "../lib/workCenters";

interface WorkCenterPickerProps {
  rows: WorkCenterRow[];
  readOnly?: boolean;
  error?: string | null;
  onSelect: (name: string) => void;
  onSelectAll: () => void;
  onManage: () => void;
}

export function WorkCenterPicker({ rows, readOnly, error, onSelect, onSelectAll, onManage }: WorkCenterPickerProps) {
  const t = useT();
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t.workCenterPicker.title}</h2>
          <p className="text-xs text-slate-500">{t.workCenterPicker.description}</p>
        </div>
        {!readOnly && (
          <button onClick={onManage} className="btn-secondary">
            <Settings className="h-3.5 w-3.5" /> {t.workCenterPicker.manageCenters}
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
          <Building2 className="h-8 w-8 text-slate-300" />
          <p>{t.workCenterPicker.noCenters}</p>
          {!readOnly && (
            <button onClick={onManage} className="btn-primary mt-2">
              <Settings className="h-3.5 w-3.5" /> {t.workCenterPicker.createFirstCenter}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <button
            onClick={onSelectAll}
            className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Eye className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{t.workCenterPicker.viewAllCenters}</p>
            <p className="text-[11px] text-slate-400">{t.workCenterPicker.readOnlyOverview}</p>
          </button>

          {rows.map((row) => (
            <button
              key={row.name}
              onClick={() => onSelect(row.name)}
              className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-600">
                {row.icon ? <img src={row.icon} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4" />}
              </div>
              <p className="truncate text-sm font-semibold text-slate-800">{row.name}</p>
              <p className="text-[11px] text-slate-400">{t.common.collaboratorCount(row.count)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
