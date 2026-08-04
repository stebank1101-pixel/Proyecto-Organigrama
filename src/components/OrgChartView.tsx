import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  Building2,
  Download,
  FileImage,
  FileText,
  IdCard,
  ListTree,
  Network,
  Plus,
  Save,
  Search,
  Settings,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { computeAllSedes, computeWorkCenterRows, type CenterSelection } from "../lib/workCenters";
import type { OrgNode, ViewMode, WorkCenter } from "../types";
import { AllCentersOverview } from "./AllCentersOverview";
import { ConfirmDialog } from "./ConfirmDialog";
import { FreeView } from "./FreeView";
import { NodeModal } from "./NodeModal";
import { TreeView } from "./TreeView";
import { WorkCenterManagerModal } from "./WorkCenterManagerModal";
import { WorkCenterPicker } from "./WorkCenterPicker";

// Extra empty margin around the chart so there's always room to drag-pan in every
// direction, even when the chart itself is smaller than the viewport.
const PAN_PADDING = 400;

interface OrgChartViewProps {
  nodes: OrgNode[];
  workCenters: WorkCenter[];
  centerError: string | null;
  onAddNode: (node: OrgNode) => void;
  onUpdateNode: (node: OrgNode) => void;
  onDeleteNode: (id: string) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onReparentNode: (id: string, newParentId: string) => void;
  onLineAdjust: (id: string, offsetX: number, offsetY: number) => void;
  onLineReset: (id: string) => void;
  onLineDelete: (id: string) => void;
  onCoordinationLink: (id: string, targetId: string) => void;
  onCoordinationUnlink: (id: string, targetId: string) => void;
  onSave: () => void;
  onCreateWorkCenter: (name: string) => Promise<boolean>;
  onRenameWorkCenter: (oldName: string, newName: string) => Promise<boolean>;
  onDeleteWorkCenter: (name: string) => Promise<boolean>;
  onUpdateWorkCenterProfile: (name: string, profile: Partial<Omit<WorkCenter, "name">>) => Promise<boolean>;
  saving: boolean;
  dirty: boolean;
  readOnly?: boolean;
}

function computeVisibleNodes(nodes: OrgNode[], department: string, search: string): OrgNode[] {
  const term = search.trim().toLowerCase();
  const matches = (n: OrgNode) =>
    (department === "all" || n.department === department) &&
    (!term ||
      n.name.toLowerCase().includes(term) ||
      n.title.toLowerCase().includes(term) ||
      n.department.toLowerCase().includes(term) ||
      (n.assignees ?? []).some((a) => a.name.toLowerCase().includes(term)));

  if (department === "all" && !term) return nodes;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visibleIds = new Set<string>();
  for (const n of nodes) {
    if (matches(n)) {
      visibleIds.add(n.id);
      let cur = n;
      while (cur.parentId && byId.has(cur.parentId)) {
        visibleIds.add(cur.parentId);
        cur = byId.get(cur.parentId) as OrgNode;
      }
    }
  }
  return nodes.filter((n) => visibleIds.has(n.id));
}

export function OrgChartView({
  nodes,
  workCenters,
  centerError,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onMoveNode,
  onReparentNode,
  onLineAdjust,
  onLineReset,
  onLineDelete,
  onCoordinationLink,
  onCoordinationUnlink,
  onSave,
  onCreateWorkCenter,
  onRenameWorkCenter,
  onDeleteWorkCenter,
  onUpdateWorkCenterProfile,
  saving,
  dirty,
  readOnly,
}: OrgChartViewProps) {
  const [selectedCenter, setSelectedCenter] = useState<CenterSelection>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  // Compact shows only area + cargo per box; detailed reveals the rest of the node's
  // data (contact info, badges, metrics) for whoever needs it later. Remembered per browser.
  const [compact, setCompact] = useState(() => localStorage.getItem("orgcraft.compactCards") !== "false");
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalState, setModalState] = useState<{
    open: boolean;
    initial: OrgNode | null;
    parentId: string | null;
    defaultSede?: string;
  }>({
    open: false,
    initial: null,
    parentId: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<OrgNode | null>(null);
  const [exporting, setExporting] = useState(false);
  const [manageCentersOpen, setManageCentersOpen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

  const activeCenter = selectedCenter && selectedCenter !== "ALL" ? selectedCenter : null;

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    container.scrollTop = Math.max(0, PAN_PADDING - 24);
  }, [viewMode, selectedCenter, deptFilter, search]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const pan = panState.current;
      const container = scrollRef.current;
      if (!pan || !container) return;
      container.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX);
      container.scrollTop = pan.scrollTop - (e.clientY - pan.startY);
    }
    function handleMouseUp() {
      if (panState.current) {
        panState.current = null;
        setIsPanning(false);
        document.body.style.userSelect = "";
      }
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, []);

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-card]") || target.closest("button") || target.closest("input") || target.closest("select")) return;
    const container = scrollRef.current;
    if (!container) return;
    e.preventDefault();
    document.body.style.userSelect = "none";
    panState.current = { startX: e.clientX, startY: e.clientY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
    setIsPanning(true);
  }

  const allSedes = useMemo(() => computeAllSedes(nodes, workCenters), [nodes, workCenters]);
  const workCenterRows = useMemo(() => computeWorkCenterRows(nodes, workCenters), [nodes, workCenters]);

  const centerNodes = useMemo(
    () => (activeCenter ? nodes.filter((n) => n.sede === activeCenter) : []),
    [nodes, activeCenter]
  );
  const departments = useMemo(
    () => Array.from(new Set(centerNodes.map((n) => n.department).filter(Boolean))).sort(),
    [centerNodes]
  );
  const visibleNodes = useMemo(
    () => computeVisibleNodes(centerNodes, deptFilter, search),
    [centerNodes, deptFilter, search]
  );

  function openCreate(parentId: string | null) {
    if (readOnly) return;
    setModalState({ open: true, initial: null, parentId, defaultSede: activeCenter ?? undefined });
  }

  function openCreateForCenter(sedeName: string) {
    if (readOnly) return;
    setModalState({ open: true, initial: null, parentId: null, defaultSede: sedeName });
  }

  function openEdit(node: OrgNode) {
    if (readOnly) return;
    setModalState({ open: true, initial: node, parentId: null });
  }

  function handleModalSave(node: OrgNode) {
    if (modalState.initial) {
      onUpdateNode(node);
    } else {
      onAddNode(node);
    }
    setModalState({ open: false, initial: null, parentId: null });
  }

  function confirmDelete() {
    if (deleteTarget) onDeleteNode(deleteTarget.id);
    setDeleteTarget(null);
  }

  function toggleCompact() {
    setCompact((prev) => {
      const next = !prev;
      localStorage.setItem("orgcraft.compactCards", String(next));
      return next;
    });
  }

  async function handleRenameCenter(oldName: string, newName: string) {
    const ok = await onRenameWorkCenter(oldName, newName);
    if (ok && selectedCenter === oldName) setSelectedCenter(newName);
  }

  async function handleDeleteCenter(name: string) {
    const ok = await onDeleteWorkCenter(name);
    if (ok && selectedCenter === name) setSelectedCenter(null);
  }

  async function exportAs(format: "png" | "svg" | "pdf") {
    const node = contentRef.current;
    if (!node) return;
    setExporting(true);
    try {
      const options = { backgroundColor: "#ffffff", pixelRatio: 2 };
      if (format === "png") {
        const dataUrl = await toPng(node, options);
        downloadUrl(dataUrl, "organigrama.png");
      } else if (format === "svg") {
        const dataUrl = await toSvg(node, options);
        downloadUrl(dataUrl, "organigrama.svg");
      } else {
        const dataUrl = await toPng(node, options);
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        const pdf = new jsPDF({
          orientation: img.width >= img.height ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height, undefined, "FAST");
        pdf.save("organigrama.pdf");
      }
    } catch (err) {
      console.error("Error exportando organigrama", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {selectedCenter === null ? (
        <WorkCenterPicker
          rows={workCenterRows}
          readOnly={readOnly}
          error={centerError}
          onSelect={(name) => setSelectedCenter(name)}
          onSelectAll={() => setSelectedCenter("ALL")}
          onManage={() => setManageCentersOpen(true)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
            <button
              onClick={() => setSelectedCenter(null)}
              className="icon-btn border border-slate-200"
              title="Volver a centros de trabajo"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>

            {activeCenter && (
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    viewMode === "tree" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  onClick={() => setViewMode("tree")}
                >
                  <ListTree className="h-3.5 w-3.5" /> Jerárquico
                </button>
                <button
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    viewMode === "free" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  onClick={() => setViewMode("free")}
                >
                  <Network className="h-3.5 w-3.5" /> Vista libre
                </button>
              </div>
            )}

            {activeCenter && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o cargo..."
                  className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                />
              </div>
            )}

            {activeCenter && (
              <select className="select-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="all">Todos los departamentos</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {activeCenter && !readOnly && (
                <button onClick={() => openCreate(null)} className="btn-secondary">
                  <Plus className="h-3.5 w-3.5" /> Nuevo nodo
                </button>
              )}
              <button
                onClick={toggleCompact}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  compact ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                title={compact ? "Mostrando solo área y cargo" : "Mostrando toda la información del cargo"}
              >
                <IdCard className="h-3.5 w-3.5" /> {compact ? "Vista compacta" : "Vista detallada"}
              </button>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button disabled={exporting} onClick={() => exportAs("png")} className="icon-btn" title="Exportar PNG">
                  <FileImage className="h-3.5 w-3.5" />
                </button>
                <button disabled={exporting} onClick={() => exportAs("svg")} className="icon-btn" title="Exportar SVG">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button disabled={exporting} onClick={() => exportAs("pdf")} className="icon-btn" title="Exportar PDF">
                  <FileText className="h-3.5 w-3.5" />
                </button>
              </div>
              {activeCenter && !readOnly && (
                <button onClick={onSave} disabled={saving || !dirty} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : dirty ? "Guardar cambios" : "Sincronizado"}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2">
            <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500">
              <Building2 className="h-3.5 w-3.5" /> Centros de trabajo:
            </span>
            <button
              onClick={() => setSelectedCenter("ALL")}
              className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                selectedCenter === "ALL"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              Todos
            </button>
            {allSedes.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedCenter(s)}
                className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  selectedCenter === s
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"
                }`}
              >
                {s}
              </button>
            ))}
            {!readOnly && (
              <button
                onClick={() => setManageCentersOpen(true)}
                className="ml-auto flex flex-shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-sky-300"
                title="Crear o modificar centros de trabajo"
              >
                <Settings className="h-3 w-3" /> Gestionar
              </button>
            )}
          </div>

          {viewMode === "free" && activeCenter && !readOnly && (
            <p className="border-b border-slate-200 bg-sky-50 px-4 py-1.5 text-[11px] text-sky-700">
              Arrastra una tarjeta sobre otra para reasignar su jefe directo, o haz clic en la "×" roja de una línea para quitarla. Mayús + arrastra entre dos tarjetas para crear una línea punteada de coordinación.
            </p>
          )}

          <div
            ref={scrollRef}
            onMouseDown={handleCanvasMouseDown}
            className={`min-h-0 flex-1 overflow-auto bg-white bg-[radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.18)_1px,transparent_0)] bg-[length:22px_22px] ${
              isPanning ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
          >
            <div style={{ padding: PAN_PADDING }} className="inline-block min-w-full">
              {selectedCenter === "ALL" ? (
                <AllCentersOverview ref={contentRef} nodes={nodes} allSedes={allSedes} compact={compact} />
              ) : viewMode === "tree" ? (
                <TreeView
                  ref={contentRef}
                  nodes={visibleNodes}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onAddChild={(p) => openCreate(p.id)}
                  readOnly={readOnly}
                  compact={compact}
                />
              ) : (
                <FreeView
                  ref={contentRef}
                  nodes={visibleNodes}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onAddChild={(p) => openCreate(p.id)}
                  onNodeMove={onMoveNode}
                  onReparent={readOnly ? undefined : onReparentNode}
                  onLineAdjust={readOnly ? undefined : onLineAdjust}
                  onLineReset={readOnly ? undefined : onLineReset}
                  onLineDelete={readOnly ? undefined : onLineDelete}
                  onCoordinationLink={readOnly ? undefined : onCoordinationLink}
                  onCoordinationUnlink={readOnly ? undefined : onCoordinationUnlink}
                  readOnly={readOnly}
                  compact={compact}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Renders before NodeModal/ConfirmDialog so those stack on top of it when opened from within. */}
      <WorkCenterManagerModal
        open={manageCentersOpen}
        centers={workCenterRows}
        nodes={nodes}
        error={centerError}
        readOnly={readOnly}
        onClose={() => setManageCentersOpen(false)}
        onCreate={onCreateWorkCenter}
        onRename={handleRenameCenter}
        onDelete={handleDeleteCenter}
        onUpdateProfile={onUpdateWorkCenterProfile}
        onEditNode={openEdit}
        onCreateNode={openCreateForCenter}
        onDeleteNode={setDeleteTarget}
      />

      <NodeModal
        open={modalState.open}
        initial={modalState.initial}
        defaultParentId={modalState.parentId}
        defaultSede={modalState.defaultSede}
        nodes={nodes}
        sedeOptions={allSedes}
        onClose={() => setModalState({ open: false, initial: null, parentId: null })}
        onSave={handleModalSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar cargo"
        description={
          deleteTarget
            ? `¿Eliminar el cargo "${deleteTarget.title}"? Sus reportes directos se reasignarán automáticamente a su superior.`
            : ""
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}
