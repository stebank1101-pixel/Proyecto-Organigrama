import { KeyRound, Loader2, Plug, PlusCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { createApiKey, fetchApiKeys, fetchSyncLogs, triggerHrSync } from "../lib/api";
import type { ApiKeyRecord, SyncLogRecord } from "../types";

interface HrIntegrationViewProps {
  onSynced: () => void;
}

const SAMPLE_EMPLOYEES = [
  { id: "EMP-101", fullName: "Laura Jiménez", jobTitle: "Analista de Datos", department: "Tecnología", location: "Madrid - Sede Central" },
  { id: "EMP-102", fullName: "Diego Salazar", jobTitle: "Ejecutivo de Cuenta", department: "Comercial", location: "Bogotá - Sede Regional" },
];

export function HrIntegrationView({ onSynced }: HrIntegrationViewProps) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [logs, setLogs] = useState<SyncLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      await createApiKey(newKeyName, newKeyProvider || "API Personalizada");
      setNewKeyName("");
      setNewKeyProvider("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleTestSync(mode: "append" | "replace") {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await triggerHrSync({ provider: "Personio HR API (demo)", mode, employees: SAMPLE_EMPLOYEES });
      setMessage(res.message);
      await refresh();
      onSynced();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Plug className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-slate-100">Sincronización con sistemas de RRHH</h2>
        </div>
        <p className="mb-4 text-xs text-slate-400">
          Endpoint: <code className="rounded bg-black/30 px-1 py-0.5">POST /api/v1/hr/sync</code>. Simula la recepción de un webhook
          desde Workday, Personio, BambooHR o Factorial.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" disabled={syncing} onClick={() => handleTestSync("append")}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
            Agregar empleados de prueba
          </button>
          <button className="btn-primary" disabled={syncing} onClick={() => handleTestSync("replace")}>
            Reemplazar con datos de prueba
          </button>
        </div>
        {message && <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{message}</p>}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-semibold text-slate-100">Claves de integración</h2>
        </div>

        <form onSubmit={handleCreateKey} className="mb-4 flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[160px]"
            placeholder="Nombre de la clave"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
          <input
            className="input flex-1 min-w-[160px]"
            placeholder="Proveedor (ej: BambooHR)"
            value={newKeyProvider}
            onChange={(e) => setNewKeyProvider(e.target.value)}
          />
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
            Crear clave
          </button>
        </form>

        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-slate-200">{k.name}</p>
                <p className="text-[11px] text-slate-500">{k.provider} · creada {k.created}</p>
              </div>
              <code className="rounded bg-black/30 px-2 py-1 text-[11px] text-slate-400">{k.key}</code>
            </div>
          ))}
          {keys.length === 0 && !loading && <p className="text-xs text-slate-500">Sin claves configuradas todavía.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Registro de sincronizaciones</h2>
          <button className="icon-btn" onClick={refresh} title="Refrescar">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">{log.system}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    log.status === "SUCCESS" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {log.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{log.details}</p>
              <p className="mt-0.5 text-[10px] text-slate-600">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
          ))}
          {logs.length === 0 && !loading && <p className="text-xs text-slate-500">Aún no hay registros de sincronización.</p>}
        </div>
      </div>
    </div>
  );
}
