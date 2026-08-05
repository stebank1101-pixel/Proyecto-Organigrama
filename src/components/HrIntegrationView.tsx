import { KeyRound, Loader2, Plug, PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { createApiKey, fetchApiKeys, fetchSyncLogs, triggerHrSync } from "../lib/api";
import { useT } from "../lib/i18n";
import { computeAllSedes } from "../lib/workCenters";
import type { ApiKeyRecord, OrgNode, SyncLogRecord, WorkCenter } from "../types";

interface HrIntegrationViewProps {
  nodes: OrgNode[];
  workCenters: WorkCenter[];
  onSynced: () => void;
  readOnly?: boolean;
}

const SAMPLE_EMPLOYEES = [
  { id: "EMP-101", fullName: "Laura Jiménez", jobTitle: "Analista de Datos", department: "Tecnología", location: "Madrid - Sede Central" },
  { id: "EMP-102", fullName: "Diego Salazar", jobTitle: "Ejecutivo de Cuenta", department: "Comercial", location: "Bogotá - Sede Regional" },
];

export function HrIntegrationView({ nodes, workCenters, onSynced, readOnly }: HrIntegrationViewProps) {
  const t = useT();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [logs, setLogs] = useState<SyncLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [targetSede, setTargetSede] = useState("");

  const allSedes = computeAllSedes(nodes, workCenters);

  async function refresh() {
    setLoading(true);
    try {
      const [keysRes, logsRes] = await Promise.all([fetchApiKeys(), fetchSyncLogs()]);
      setKeys(keysRes.data);
      setLogs(logsRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      await createApiKey(newKeyName, newKeyProvider || t.hrIntegration.defaultProvider);
      setNewKeyName("");
      setNewKeyProvider("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleTestSync(mode: "append" | "replace") {
    if (!targetSede) return;
    setSyncing(true);
    setMessage(null);
    try {
      const res = await triggerHrSync({ provider: "Personio HR API (demo)", mode, employees: SAMPLE_EMPLOYEES, targetSede });
      setMessage(res.message);
      await refresh();
      onSynced();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t.hrIntegration.syncError);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      {readOnly && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{t.hrIntegration.readOnlyNotice}</p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Plug className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-900">{t.hrIntegration.syncTitle}</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          {t.hrIntegration.endpointLabel} <code className="rounded bg-slate-100 px-1 py-0.5">POST /api/v1/hr/sync</code>.{" "}
          {t.hrIntegration.endpointDescription}
        </p>
        {!readOnly && (
          <>
            <label className="mb-3 block text-xs font-medium text-slate-600">
              {t.hrIntegration.targetCenter}
              <select className="input mt-1" value={targetSede} onChange={(e) => setTargetSede(e.target.value)}>
                <option value="">{t.hrIntegration.chooseCenterOption}</option>
                {allSedes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" disabled={syncing || !targetSede} onClick={() => handleTestSync("append")}>
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                {t.hrIntegration.addTestEmployees}
              </button>
              <button className="btn-primary" disabled={syncing || !targetSede} onClick={() => handleTestSync("replace")}>
                {t.hrIntegration.replaceTestData}
              </button>
            </div>
          </>
        )}
        {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-semibold text-slate-900">{t.hrIntegration.integrationKeysTitle}</h2>
        </div>

        {!readOnly && (
          <form onSubmit={handleCreateKey} className="mb-4 flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[160px]"
              placeholder={t.hrIntegration.keyNamePlaceholder}
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <input
              className="input flex-1 min-w-[160px]"
              placeholder={t.hrIntegration.providerPlaceholder}
              value={newKeyProvider}
              onChange={(e) => setNewKeyProvider(e.target.value)}
            />
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
              {t.hrIntegration.createKey}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-slate-800">{k.name}</p>
                <p className="text-[11px] text-slate-500">{k.provider} · {t.hrIntegration.createdOn(k.created)}</p>
              </div>
              <code className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-500">{k.key}</code>
            </div>
          ))}
          {keys.length === 0 && !loading && <p className="text-xs text-slate-500">{t.hrIntegration.noKeys}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{t.hrIntegration.syncLogTitle}</h2>
          <button className="icon-btn" onClick={refresh} title={t.hrIntegration.refreshTitle}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-800">{log.system}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    log.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {log.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{log.details}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
          ))}
          {logs.length === 0 && !loading && <p className="text-xs text-slate-500">{t.hrIntegration.noLogs}</p>}
        </div>
      </div>
    </div>
  );
}
