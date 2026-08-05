import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { ArrowLeft, Building2, Download, FileImage, FileText, IdCard, Link2, Minus, Plus, Save, Search, Settings } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useT } from "../lib/i18n";
import { computeAllSedes, computeWorkCenterRows, type CenterSelection } from "../lib/workCenters";
import type { OrgNode, WorkCenter } from "../types";
import { AllCentersOverview } from "./AllCentersOverview";
import { ConfirmDialog } from "./ConfirmDialog";
import { NodeModal } from "./NodeModal";
import { TreeView } from "./TreeView";
import { WorkCenterManagerModal } from "./WorkCenterManagerModal";
import { WorkCenterPicker } from "./WorkCenterPicker";

// Extra empty margin around the chart so there's always room to drag-pan in every
// direction, even when the chart itself is smaller than the viewport.
const PAN_PADDING = 400;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
}

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
  onCoordinationStyleToggle: (id: string, targetId: string) => void;
  onCoordinationLineAdjust: (id: string, targetId: string, offsetX: number, offsetY: number) => void;
  onCoordinationUnlink: (id: string, targetId: string) => void;
  onSave: () => void;
  onCreateWorkCenter: (name: string) => Promise<boolean>;
  onRenameWorkCenter: (oldName: string, newName: string) => Promise<boolean>;
  onDeleteWorkCenter: (name: string) => Promise<boolean>;
  onUpdateWorkCenterProfile: (name: string, profile: Partial<Omit<WorkCenter, "name">>) => Promise<boolean>;
  onSetDefaultWorkCenter: (name: string, isDefault: boolean) => Promise<boolean>;
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
  onCoordinationStyleToggle,
  onCoordinationLineAdjust,
  onCoordinationUnlink,
  onSave,
  onCreateWorkCenter,
  onRenameWorkCenter,
  onDeleteWorkCenter,
  onUpdateWorkCenterProfile,
  onSetDefaultWorkCenter,
  saving,
  dirty,
  readOnly,
}: OrgChartViewProps) {
  const t = useT();
  const [selectedCenter, setSelectedCenter] = useState<CenterSelection>(null);
  // Once work centers finish loading, jump straight to whichever one is marked as default
  // instead of the picker — but only the first time, so deliberately going back to the
  // picker later (via "Volver a centros de trabajo") isn't immediately overridden.
  const didAutoSelectDefault = useRef(false);
  // Compact shows only area + cargo per box; detailed reveals the rest of the node's
  // data (contact info, badges, metrics) for whoever needs it later. Remembered per browser.
  const [compact, setCompact] = useState(() => localStorage.getItem("orgcraft.compactCards") !== "false");
  // While on, dragging a card draws a coordination line instead of reassigning its boss —
  // an explicit toggle so the feature doesn't rely on discovering the Shift+drag shortcut.
  const [linkMode, setLinkMode] = useState(false);
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
  const [zoom, setZoom] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

  const activeCenter = selectedCenter && selectedCenter !== "ALL" ? selectedCenter : null;

  useEffect(() => {
    if (didAutoSelectDefault.current) return;
    if (selectedCenter !== null) {
      didAutoSelectDefault.current = true;
      return;
    }
    if (workCenters.length === 0) return; // still loading — try again once it arrives
    didAutoSelectDefault.current = true;
    const defaultCenter = workCenters.find((c) => c.isDefault);
    if (defaultCenter) setSelectedCenter(defaultCenter.name);
  }, [workCenters, selectedCenter]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    container.scrollTop = Math.max(0, PAN_PADDING - 24);
    setLinkMode(false);
    setZoom(1);
  }, [selectedCenter, deptFilter, search]);

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

  function zoomIn() {
    setZoom((z) => clampZoom(z + ZOOM_STEP));
  }

  function zoomOut() {
    setZoom((z) => clampZoom(z - ZOOM_STEP));
  }

  function resetZoom() {
    setZoom(1);
  }

  // Ctrl/Cmd+wheel zooms instead of scrolling — centered on the cursor, so whatever's under
  // it stays put rather than the canvas visibly jumping. Plain wheel still scrolls normally.
  function handleWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const container = scrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const contentX = container.scrollLeft + cursorX;
    const contentY = container.scrollTop + cursorY;
    const prevZoom = zoom;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const nextZoom = clampZoom(prevZoom * factor);
    if (nextZoom === prevZoom) return;
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      const c = scrollRef.current;
      if (!c) return;
      c.scrollLeft = contentX * (nextZoom / prevZoom) - cursorX;
      c.scrollTop = contentY * (nextZoom / prevZoom) - cursorY;
    });
  }

  const allSedes = useMemo(() => computeAllSedes(nodes, workCenters), [nodes, workCenters]);
  const workCenterRows = useMemo(() => computeWorkCenterRows(nodes, workCenters), [nodes, workCenters]);
  const activeCenterProfile = activeCenter ? workCenters.find((c) => c.name === activeCenter) : undefined;

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

  // Following a hub-link card just switches which center is showing — works for
  // read-only guests too, since it's navigation rather than an edit.
  function handleNavigateToSede(sede: string) {
    setSelectedCenter(sede);
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
              title={t.orgChart.backToCenters}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>

            {activeCenter && !readOnly && (
              <button
                onClick={() => setLinkMode((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  linkMode ? "border-purple-300 bg-purple-50 text-purple-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                title={linkMode ? t.orgChart.connectLinesHintActive : t.orgChart.connectLinesHintInactive}
              >
                <Link2 className="h-3.5 w-3.5" /> {linkMode ? t.orgChart.connecting : t.orgChart.connectLines}
              </button>
            )}

            {activeCenter && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.orgChart.searchPlaceholder}
                  className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                />
              </div>
            )}

            {activeCenter && (
              <select className="select-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="all">{t.orgChart.allDepartments}</option>
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
                  <Plus className="h-3.5 w-3.5" /> {t.orgChart.newNode}
                </button>
              )}
              <button
                onClick={toggleCompact}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  compact ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
                title={compact ? t.orgChart.compactHint : t.orgChart.detailedHint}
              >
                <IdCard className="h-3.5 w-3.5" /> {compact ? t.orgChart.compactView : t.orgChart.detailedView}
              </button>
              {activeCenter && (
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button onClick={zoomOut} disabled={zoom <= MIN_ZOOM} className="icon-btn" title={t.orgChart.zoomOut}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={resetZoom}
                    className="min-w-[3.25rem] rounded-md px-1.5 py-1 text-center text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                    title={t.orgChart.zoomReset}
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button onClick={zoomIn} disabled={zoom >= MAX_ZOOM} className="icon-btn" title={t.orgChart.zoomIn}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button disabled={exporting} onClick={() => exportAs("png")} className="icon-btn" title={t.orgChart.exportPng}>
                  <FileImage className="h-3.5 w-3.5" />
                </button>
                <button disabled={exporting} onClick={() => exportAs("svg")} className="icon-btn" title={t.orgChart.exportSvg}>
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button disabled={exporting} onClick={() => exportAs("pdf")} className="icon-btn" title={t.orgChart.exportPdf}>
                  <FileText className="h-3.5 w-3.5" />
                </button>
              </div>
              {activeCenter && !readOnly && (
                <button onClick={onSave} disabled={saving || !dirty} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" /> {saving ? t.orgChart.saving : dirty ? t.orgChart.saveChanges : t.orgChart.synced}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2">
            <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500">
              <Building2 className="h-3.5 w-3.5" /> {t.orgChart.workCentersLabel}
            </span>
            <button
              onClick={() => setSelectedCenter("ALL")}
              className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                selectedCenter === "ALL"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t.orgChart.all}
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
                title={t.orgChart.manageCentersHint}
              >
                <Settings className="h-3 w-3" /> {t.orgChart.manage}
              </button>
            )}
          </div>

          {activeCenter && !readOnly && (
            <p className={`border-b px-4 py-1.5 text-[11px] ${linkMode ? "border-purple-200 bg-purple-50 text-purple-700" : "border-slate-200 bg-sky-50 text-sky-700"}`}>
              {linkMode ? t.orgChart.linkModeHintActive : t.orgChart.linkModeHintInactive}
            </p>
          )}

          <div
            ref={scrollRef}
            onMouseDown={handleCanvasMouseDown}
            onWheel={activeCenter ? handleWheel : undefined}
            className={`min-h-0 flex-1 overflow-auto bg-white bg-[radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.18)_1px,transparent_0)] bg-[length:22px_22px] ${
              isPanning ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
          >
            <div style={{ padding: PAN_PADDING }} className="inline-block min-w-full">
              {selectedCenter === "ALL" ? (
                <AllCentersOverview
                  ref={contentRef}
                  nodes={nodes}
                  allSedes={allSedes}
                  compact={compact}
                  onNavigateToSede={handleNavigateToSede}
                  workCenters={workCenters}
                />
              ) : (
                <TreeView
                  ref={contentRef}
                  nodes={visibleNodes}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onAddChild={(p) => openCreate(p.id)}
                  onRemoveBoss={readOnly ? undefined : (node) => onLineDelete(node.id)}
                  onNodeMove={onMoveNode}
                  onNavigateToSede={handleNavigateToSede}
                  zoom={zoom}
                  logo={activeCenterProfile?.logo}
                  canvasBackgroundColor={activeCenterProfile?.backgroundColor}
                  canvasBackgroundImage={activeCenterProfile?.backgroundImage}
                  readOnly={readOnly}
                  compact={compact}
                  linkMode={linkMode}
                  onReparent={readOnly ? undefined : onReparentNode}
                  onLineAdjust={readOnly ? undefined : onLineAdjust}
                  onLineReset={readOnly ? undefined : onLineReset}
                  onLineDelete={readOnly ? undefined : onLineDelete}
                  onCoordinationLink={readOnly ? undefined : onCoordinationLink}
                  onCoordinationStyleToggle={readOnly ? undefined : onCoordinationStyleToggle}
                  onCoordinationLineAdjust={readOnly ? undefined : onCoordinationLineAdjust}
                  onCoordinationUnlink={readOnly ? undefined : onCoordinationUnlink}
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
        onSetDefault={onSetDefaultWorkCenter}
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
        title={t.orgChart.deleteNodeTitle}
        description={deleteTarget ? t.orgChart.deleteNodeDescription(deleteTarget.title) : ""}
        confirmLabel={t.orgChart.deleteConfirmLabel}
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
