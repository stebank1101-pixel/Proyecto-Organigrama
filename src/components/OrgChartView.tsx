import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { Building2, Download, FileImage, FileText, ListTree, Network, Plus, Save, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OrgNode, ViewMode } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { FreeView } from "./FreeView";
import { NodeModal } from "./NodeModal";
import { TreeView } from "./TreeView";

interface OrgChartViewProps {
  nodes: OrgNode[];
  onAddNode: (node: OrgNode) => void;
  onUpdateNode: (node: OrgNode) => void;
  onDeleteNode: (id: string) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  readOnly?: boolean;
}

function computeVisibleNodes(nodes: OrgNode[], sede: string, department: string, search: string): OrgNode[] {
  const term = search.trim().toLowerCase();
  const matches = (n: OrgNode) =>
    (sede === "all" || n.sede === sede) &&
    (department === "all" || n.department === department) &&
    (!term ||
      n.name.toLowerCase().includes(term) ||
      n.title.toLowerCase().includes(term) ||
      n.department.toLowerCase().includes(term));

  if (sede === "all" && department === "all" && !term) return nodes;

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
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onMoveNode,
  onSave,
  saving,
  dirty,
  readOnly,
}: OrgChartViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [sedeFilter, setSedeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modalState, setModalState] = useState<{ open: boolean; initial: OrgNode | null; parentId: string | null }>({
    open: false,
    initial: null,
    parentId: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<OrgNode | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);

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

  const sedes = useMemo(() => Array.from(new Set(nodes.map((n) => n.sede).filter(Boolean))).sort(), [nodes]);
  const departments = useMemo(() => Array.from(new Set(nodes.map((n) => n.department).filter(Boolean))).sort(), [nodes]);
  const sedeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of nodes) {
      if (!n.sede) continue;
      counts.set(n.sede, (counts.get(n.sede) || 0) + 1);
    }
    return counts;
  }, [nodes]);

  const visibleNodes = useMemo(
    () => computeVisibleNodes(nodes, sedeFilter, deptFilter, search),
    [nodes, sedeFilter, deptFilter, search]
  );

  function openCreate(parentId: string | null) {
    if (readOnly) return;
    setModalState({ open: true, initial: null, parentId });
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
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
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

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cargo..."
            className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <select className="select-sm" value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)}>
          <option value="all">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select className="select-sm" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="all">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button onClick={() => openCreate(null)} className="btn-secondary">
              <Plus className="h-3.5 w-3.5" /> Nuevo nodo
            </button>
          )}
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
          {!readOnly && (
            <button onClick={onSave} disabled={saving || !dirty} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : dirty ? "Guardar cambios" : "Sincronizado"}
            </button>
          )}
        </div>
      </div>

      {sedes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2">
          <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500">
            <Building2 className="h-3.5 w-3.5" /> Centros de trabajo:
          </span>
          <button
            onClick={() => setSedeFilter("all")}
            className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
              sedeFilter === "all"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            Todos ({nodes.length})
          </button>
          {sedes.map((s) => (
            <button
              key={s}
              onClick={() => setSedeFilter(s)}
              className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                sedeFilter === s
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"
              }`}
            >
              {s} ({sedeCounts.get(s) ?? 0})
            </button>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        onMouseDown={handleCanvasMouseDown}
        className={`min-h-0 flex-1 overflow-auto bg-white bg-[radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.18)_1px,transparent_0)] bg-[length:22px_22px] ${
          isPanning ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
      >
        {viewMode === "tree" ? (
          <TreeView
            ref={contentRef}
            nodes={visibleNodes}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onAddChild={(p) => openCreate(p.id)}
            readOnly={readOnly}
          />
        ) : (
          <FreeView
            ref={contentRef}
            nodes={visibleNodes}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onAddChild={(p) => openCreate(p.id)}
            onNodeMove={onMoveNode}
            readOnly={readOnly}
          />
        )}
      </div>

      <NodeModal
        open={modalState.open}
        initial={modalState.initial}
        defaultParentId={modalState.parentId}
        nodes={nodes}
        onClose={() => setModalState({ open: false, initial: null, parentId: null })}
        onSave={handleModalSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar colaborador"
        description={
          deleteTarget
            ? `¿Eliminar a "${deleteTarget.name}"? Sus reportes directos se reasignarán automáticamente a su superior.`
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
