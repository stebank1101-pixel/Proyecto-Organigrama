import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiGeneratorView } from "./components/AiGeneratorView";
import { HrIntegrationView } from "./components/HrIntegrationView";
import { LoginView } from "./components/LoginView";
import { NavBar } from "./components/NavBar";
import { OrgChartView } from "./components/OrgChartView";
import { ProfilesView } from "./components/ProfilesView";
import {
  bulkSyncNodes,
  createWorkCenterApi,
  deleteWorkCenterApi,
  fetchNodes,
  fetchWorkCenters,
  renameWorkCenterApi,
  updateWorkCenterProfileApi,
} from "./lib/api";
import { useAuth } from "./lib/auth";
import type { OrgNode, TabId, WorkCenter } from "./types";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

export default function App() {
  const { user, loading: authLoading, isAdmin, isGuest } = useAuth();
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [centerError, setCenterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("chart");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const pushToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const loadNodes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchNodes();
      setNodes(res.data);
      setDirty(false);
    } catch (err) {
      if (!silent) setLoadError(err instanceof Error ? err.message : "No se pudo cargar el organigrama");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user || isGuest) loadNodes();
  }, [user, isGuest, loadNodes]);

  useEffect(() => {
    if (!user && !isGuest) return;
    fetchWorkCenters()
      .then((res) => setWorkCenters(res.data))
      .catch((err) => setCenterError(err instanceof Error ? err.message : "No se pudieron cargar los centros de trabajo"));
  }, [user, isGuest]);

  useEffect(() => {
    if (!isAdmin && activeTab === "profiles") setActiveTab("chart");
    if (isGuest && (activeTab === "ai" || activeTab === "hr")) setActiveTab("chart");
  }, [isAdmin, isGuest, activeTab]);

  function handleAddNode(node: OrgNode) {
    setNodes((prev) => [...prev, node]);
    setDirty(true);
  }

  function handleUpdateNode(node: OrgNode) {
    setNodes((prev) => prev.map((n) => (n.id === node.id ? node : n)));
    setDirty(true);
  }

  function handleDeleteNode(id: string) {
    setNodes((prev) => {
      const target = prev.find((n) => n.id === id);
      const fallbackParentId = target ? target.parentId : null;
      return prev.filter((n) => n.id !== id).map((n) => (n.parentId === id ? { ...n, parentId: fallbackParentId } : n));
    });
    setDirty(true);
  }

  function handleMoveNode(id: string, x: number, y: number) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, freeX: x, freeY: y } : n)));
    setDirty(true);
  }

  function handleReparentNode(id: string, newParentId: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, parentId: newParentId } : n)));
    setDirty(true);
    pushToast("Jefe directo reasignado");
  }

  function handleLineAdjust(id: string, offsetX: number, offsetY: number) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, lineOffsetX: offsetX, lineOffsetY: offsetY } : n)));
    setDirty(true);
  }

  function handleLineReset(id: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, lineOffsetX: undefined, lineOffsetY: undefined } : n)));
    setDirty(true);
  }

  async function handleBulkUpdateNodes(updatedNodes: OrgNode[]) {
    setNodes(updatedNodes);
    setDirty(true);
    await bulkSyncNodes(updatedNodes);
    setDirty(false);
  }

  function handleApplyAiNodes(newNodes: OrgNode[], mode: "replace" | "append", targetSede: string) {
    if (mode === "replace") {
      setNodes((prev) => [...prev.filter((n) => n.sede !== targetSede), ...newNodes]);
    } else {
      setNodes((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const remapped = newNodes.map((n) => (existingIds.has(n.id) ? { ...n, id: `${n.id}-${Date.now()}` } : n));
        return [...prev, ...remapped];
      });
    }
    setDirty(true);
    setActiveTab("chart");
    pushToast(`Se aplicaron ${newNodes.length} nodos generados por IA en ${targetSede}`);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await bulkSyncNodes(nodes);
      setDirty(false);
      pushToast("Organigrama sincronizado correctamente");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleHrSynced() {
    await loadNodes(true);
    pushToast("Organigrama actualizado desde RRHH");
  }

  async function handleCreateWorkCenter(name: string): Promise<boolean> {
    setCenterError(null);
    try {
      await createWorkCenterApi(name);
      setWorkCenters((prev) =>
        prev.some((c) => c.name === name) ? prev : [...prev, { name, address: "", email: "", phone: "", headcount: 0, budget: "" }]
      );
      return true;
    } catch (err) {
      setCenterError(err instanceof Error ? err.message : "No se pudo crear el centro de trabajo");
      return false;
    }
  }

  async function handleRenameWorkCenter(oldName: string, newName: string): Promise<boolean> {
    setCenterError(null);
    try {
      await renameWorkCenterApi(oldName, newName);
      if (nodes.some((n) => n.sede === oldName)) {
        await handleBulkUpdateNodes(nodes.map((n) => (n.sede === oldName ? { ...n, sede: newName } : n)));
      }
      setWorkCenters((prev) => {
        const existing = prev.find((c) => c.name === oldName);
        if (existing) return prev.map((c) => (c.name === oldName ? { ...c, name: newName } : c));
        return [...prev, { name: newName, address: "", email: "", phone: "", headcount: 0, budget: "" }];
      });
      return true;
    } catch (err) {
      setCenterError(err instanceof Error ? err.message : "No se pudo renombrar el centro de trabajo");
      return false;
    }
  }

  async function handleDeleteWorkCenter(name: string): Promise<boolean> {
    setCenterError(null);
    try {
      await deleteWorkCenterApi(name);
      if (nodes.some((n) => n.sede === name)) {
        await handleBulkUpdateNodes(nodes.map((n) => (n.sede === name ? { ...n, sede: "" } : n)));
      }
      setWorkCenters((prev) => prev.filter((c) => c.name !== name));
      return true;
    } catch (err) {
      setCenterError(err instanceof Error ? err.message : "No se pudo eliminar el centro de trabajo");
      return false;
    }
  }

  async function handleUpdateWorkCenterProfile(name: string, profile: Partial<Omit<WorkCenter, "name">>): Promise<boolean> {
    setCenterError(null);
    try {
      await updateWorkCenterProfileApi(name, profile);
      setWorkCenters((prev) => {
        const existing = prev.find((c) => c.name === name);
        if (existing) return prev.map((c) => (c.name === name ? { ...c, ...profile } : c));
        return [...prev, { name, address: "", email: "", phone: "", headcount: 0, budget: "", ...profile }];
      });
      return true;
    } catch (err) {
      setCenterError(err instanceof Error ? err.message : "No se pudo actualizar el centro de trabajo");
      return false;
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-slate-50 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando sesión...
      </div>
    );
  }

  if (!user && !isGuest) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <NavBar active={activeTab} onChange={setActiveTab} nodeCount={nodes.length} />

      <main className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando organigrama...
          </div>
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
            <p className="text-sm">{loadError}</p>
            <button className="btn-secondary" onClick={() => loadNodes()}>
              Reintentar
            </button>
          </div>
        ) : activeTab === "chart" ? (
          <OrgChartView
            nodes={nodes}
            workCenters={workCenters}
            centerError={centerError}
            onAddNode={handleAddNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onMoveNode={handleMoveNode}
            onReparentNode={handleReparentNode}
            onLineAdjust={handleLineAdjust}
            onLineReset={handleLineReset}
            onSave={handleSave}
            onCreateWorkCenter={handleCreateWorkCenter}
            onRenameWorkCenter={handleRenameWorkCenter}
            onDeleteWorkCenter={handleDeleteWorkCenter}
            onUpdateWorkCenterProfile={handleUpdateWorkCenterProfile}
            saving={saving}
            dirty={dirty}
            readOnly={!isAdmin}
          />
        ) : activeTab === "ai" ? (
          <AiGeneratorView nodes={nodes} workCenters={workCenters} onApply={handleApplyAiNodes} readOnly={!isAdmin} />
        ) : activeTab === "hr" ? (
          <HrIntegrationView nodes={nodes} workCenters={workCenters} onSynced={handleHrSynced} readOnly={!isAdmin} />
        ) : (
          <ProfilesView />
        )}
      </main>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg ${
              t.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {t.tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
