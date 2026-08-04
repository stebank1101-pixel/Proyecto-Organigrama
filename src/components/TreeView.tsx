import { forwardRef, useLayoutEffect, useRef, useState, useMemo } from "react";
import { getDepartmentStyle } from "../lib/departmentColors";
import { OrgIcon } from "../lib/icons";
import type { OrgNode } from "../types";
import { NodeCard } from "./NodeCard";

interface TreeHandlers {
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  highlightedId?: string | null;
  readOnly?: boolean;
  compact?: boolean;
}

interface TreeViewProps extends TreeHandlers {
  nodes: OrgNode[];
  onCoordinationStyleToggle?: (id: string, targetId: string) => void;
  onCoordinationUnlink?: (id: string, targetId: string) => void;
}

function Card({ node, ...handlers }: { node: OrgNode } & TreeHandlers) {
  return (
    <div className="inline-block" data-coord-id={node.id}>
      <NodeCard
        node={node}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
        onAddChild={handlers.onAddChild}
        highlighted={handlers.highlightedId === node.id}
        readOnly={handlers.readOnly}
        compact={handlers.compact}
      />
    </div>
  );
}

// Past the spine, every branch stacks vertically (one report per row, joined by an
// L-connector) instead of opening new horizontal columns, so deep branches grow
// downward instead of stretching the whole chart sideways.
function VerticalBranch({
  node,
  childrenByParent,
  ...handlers
}: { node: OrgNode; childrenByParent: Map<string, OrgNode[]> } & TreeHandlers) {
  const children = childrenByParent.get(node.id) || [];
  return (
    <li className="org-vbranch-item">
      <Card node={node} {...handlers} />
      {children.length > 0 && (
        <ul className="org-vbranch-list">
          {children.map((child) => (
            <VerticalBranch key={child.id} node={child} childrenByParent={childrenByParent} {...handlers} />
          ))}
        </ul>
      )}
    </li>
  );
}

// A root's direct children (departments) form the horizontal spine row; everything
// each one leads to renders as a vertical branch column beneath it. The colored bar
// labels the whole branch by department, echoing the reference org chart where each
// division gets its own color instead of coloring by seniority.
function SpineColumn({
  node,
  childrenByParent,
  ...handlers
}: { node: OrgNode; childrenByParent: Map<string, OrgNode[]> } & TreeHandlers) {
  const children = childrenByParent.get(node.id) || [];
  const deptStyle = getDepartmentStyle(node.department);
  return (
    <li className="org-spine-item">
      <div className={`mb-2 flex w-[240px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm ${deptStyle.header}`}>
        <OrgIcon name={node.iconName} className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{node.department || node.title}</span>
      </div>
      <Card node={node} {...handlers} />
      {children.length > 0 && (
        <ul className="org-vbranch-list">
          {children.map((child) => (
            <VerticalBranch key={child.id} node={child} childrenByParent={childrenByParent} {...handlers} />
          ))}
        </ul>
      )}
    </li>
  );
}

function RootBranch({
  node,
  childrenByParent,
  ...handlers
}: { node: OrgNode; childrenByParent: Map<string, OrgNode[]> } & TreeHandlers) {
  const children = childrenByParent.get(node.id) || [];
  return (
    <li className="org-spine-item">
      <Card node={node} {...handlers} />
      {children.length > 0 && (
        <ul className="org-spine-row">
          {children.map((child) => (
            <SpineColumn key={child.id} node={child} childrenByParent={childrenByParent} {...handlers} />
          ))}
        </ul>
      )}
    </li>
  );
}

interface MeasuredCoordLine {
  id: string;
  targetId: string;
  style: "solid" | "dashed";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

// Coordination links are only stored with a bend offset for Vista libre's free canvas;
// here node positions come from normal document flow, so lines are measured straight
// from the actual rendered card positions after every layout pass.
function useMeasuredCoordLines(
  containerRef: React.RefObject<HTMLDivElement | null>,
  nodes: OrgNode[]
): { lines: MeasuredCoordLine[]; size: { width: number; height: number } } {
  const [lines, setLines] = useState<MeasuredCoordLine[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      setSize({ width: containerEl.scrollWidth, height: containerEl.scrollHeight });

      const next: MeasuredCoordLine[] = [];
      for (const node of nodes) {
        for (const link of node.coordinationLinks || []) {
          const fromEl = containerEl.querySelector(`[data-coord-id="${CSS.escape(node.id)}"]`);
          const toEl = containerEl.querySelector(`[data-coord-id="${CSS.escape(link.targetId)}"]`);
          if (!fromEl || !toEl) continue;
          const a = fromEl.getBoundingClientRect();
          const b = toEl.getBoundingClientRect();
          const x1 = a.left + a.width / 2 - containerRect.left;
          const y1 = a.top + a.height / 2 - containerRect.top;
          const x2 = b.left + b.width / 2 - containerRect.left;
          const y2 = b.top + b.height / 2 - containerRect.top;
          next.push({ id: node.id, targetId: link.targetId, style: link.style, x1, y1, x2, y2, midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 });
        }
      }
      setLines(next);
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, nodes]);

  return { lines, size };
}

export const TreeView = forwardRef<HTMLDivElement, TreeViewProps>(function TreeView(
  { nodes, onEdit, onDelete, onAddChild, highlightedId, readOnly, compact, onCoordinationStyleToggle, onCoordinationUnlink },
  ref
) {
  const innerRef = useRef<HTMLDivElement | null>(null);

  function setRefs(el: HTMLDivElement | null) {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }

  const { roots, childrenByParent } = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id));
    const map = new Map<string, OrgNode[]>();
    const rootList: OrgNode[] = [];
    for (const node of nodes) {
      if (node.parentId && ids.has(node.parentId)) {
        const list = map.get(node.parentId) || [];
        list.push(node);
        map.set(node.parentId, list);
      } else {
        rootList.push(node);
      }
    }
    return { roots: rootList, childrenByParent: map };
  }, [nodes]);

  const { lines: coordLines, size: coordSize } = useMeasuredCoordLines(innerRef, nodes);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No hay nodos que coincidan con los filtros actuales.
      </div>
    );
  }

  const handlers = { onEdit, onDelete, onAddChild, highlightedId, readOnly, compact };

  return (
    <div ref={setRefs} className="org-tree relative min-w-max px-10 py-8">
      <ul className="org-spine-row">
        {roots.map((root) => (
          <RootBranch key={root.id} node={root} childrenByParent={childrenByParent} {...handlers} />
        ))}
      </ul>

      {coordLines.length > 0 && (
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={coordSize.width}
          height={coordSize.height}
          style={{ width: coordSize.width, height: coordSize.height }}
        >
          {coordLines.map((line) => (
            <g key={`${line.id}->${line.targetId}`}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(168,85,247,0.7)"
                strokeWidth={2}
                strokeDasharray={line.style === "dashed" ? "6 4" : undefined}
              />
              {!readOnly && (
                <>
                  <g
                    transform={`translate(${line.midX - 12}, ${line.midY})`}
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                    onClick={() => onCoordinationStyleToggle?.(line.id, line.targetId)}
                  >
                    <circle r={7} className="fill-white stroke-slate-400 hover:fill-slate-50" strokeWidth={2} />
                    <line
                      x1={-3.5}
                      y1={0}
                      x2={3.5}
                      y2={0}
                      stroke="rgb(100,116,139)"
                      strokeWidth={1.5}
                      strokeDasharray={line.style === "dashed" ? "2 1.5" : undefined}
                    />
                    <title>{line.style === "dashed" ? "Cambiar a línea continua" : "Cambiar a línea punteada"}</title>
                  </g>
                  <g
                    transform={`translate(${line.midX + 12}, ${line.midY})`}
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                    onClick={() => onCoordinationUnlink?.(line.id, line.targetId)}
                  >
                    <circle r={7} className="fill-white stroke-rose-400 hover:fill-rose-50" strokeWidth={2} />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={10} className="select-none fill-rose-500">
                      ×
                    </text>
                    <title>Quitar esta línea de coordinación</title>
                  </g>
                </>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
});
