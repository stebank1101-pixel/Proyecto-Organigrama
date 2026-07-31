import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { Download, FileImage, FileText, ListTree, Network, Plus, Save, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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

export function OrgChartView({ nodes, onAddNode, onUpdateNode, onDeleteNode, onMoveNode, onSave, saving, dirty }: OrgChartViewProps) {
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
  const contentRef = useRef<HTMLDivElement>(null);

  const sedes = useMemo(() => Array.from(new Set(nodes.map((n) => n.sede).filter(Boolean))).sort(), [nodes]);
  const departments = useMemo(() => Array.from(new Set(nodes.map((n) => n.department).filter(Boolean))).sort(), [nodes]);

  const visibleNodes = useMemo(
    () => computeVisibleNodes(nodes, sedeFilter, deptFilter, search),
    [nodes, sedeFilter, deptFilter, search]
  );

  function openCreate(parentId: string | null) {
    setModalState({ open: true, initial: null, parentId });
  }

  function openEdit(node: OrgNode) {
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
      const options = { backgroundColor: "#0f172a", pixelRatio: 2 };
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
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950/60 px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 p-1">
          <button
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              viewMode === "tree" ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => setViewMode("tree")}
          >
            <ListTree className="h-3.5 w-3.5" /> Jerárquico
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              viewMode === "free" ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => setViewMode("free")}
          >
            <Network className="h-3.5 w-3.5" /> Vista libre
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cargo..."
            className="w-56 rounded-lg border border-white/10 bg-slate-900 py-1.5 pl-8 pr-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
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
          <button onClick={() => openCreate(null)} className="btn-secondary">
            <Plus className="h-3.5 w-3.5" /> Nuevo nodo
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 p-1">
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
          <button onClick={onSave} disabled={saving || !dirty} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : dirty ? "Guardar cambios" : "Sincronizado"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.15)_1px,transparent_0)] bg-[length:22px_22px]">
        {viewMode === "tree" ? (
          <TreeView ref={contentRef} nodes={visibleNodes} onEdit={openEdit} onDelete={setDeleteTarget} onAddChild={(p) => openCreate(p.id)} />
        ) : (
          <FreeView
            ref={contentRef}
            nodes={visibleNodes}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onAddChild={(p) => openCreate(p.id)}
            onNodeMove={onMoveNode}
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
