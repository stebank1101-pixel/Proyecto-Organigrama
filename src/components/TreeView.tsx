import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getDepartmentStyle } from "../lib/departmentColors";
import { OrgIcon } from "../lib/icons";
import type { OrgNode } from "../types";
import { NodeCard } from "./NodeCard";

interface TreeHandlers {
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  onRemoveBoss?: (node: OrgNode) => void;
  highlightedId?: string | null;
  readOnly?: boolean;
  compact?: boolean;
}

interface TreeViewProps extends TreeHandlers {
  nodes: OrgNode[];
  /** While on, dragging a card draws a coordination line to whatever it's released on,
   * instead of reassigning its boss (Shift+drag also works regardless of this toggle). */
  linkMode?: boolean;
  onReparent?: (id: string, newParentId: string) => void;
  onCoordinationLink?: (id: string, targetId: string) => void;
  onCoordinationStyleToggle?: (id: string, targetId: string) => void;
  onCoordinationLineAdjust?: (id: string, targetId: string, offsetX: number, offsetY: number) => void;
  onCoordinationUnlink?: (id: string, targetId: string) => void;
}

// Every descendant of `nodeId` is an invalid reparent target — dropping a node onto its
// own descendant would create a cycle in the reporting chain.
function getDescendantIds(nodeId: string, nodes: OrgNode[]): Set<string> {
  const result = new Set<string>();
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const n of nodes) {
      if (n.parentId === current && !result.has(n.id)) {
        result.add(n.id);
        stack.push(n.id);
      }
    }
  }
  return result;
}

function Card({
  node,
  onCardPointerDown,
  isHoverTarget,
  isDragging,
  ...handlers
}: {
  node: OrgNode;
  onCardPointerDown: (e: React.PointerEvent, node: OrgNode) => void;
  isHoverTarget?: boolean;
  isDragging?: boolean;
} & TreeHandlers) {
  return (
    <div
      className={`inline-block rounded-xl transition-shadow ${!handlers.readOnly ? "cursor-grab active:cursor-grabbing" : ""} ${
        isHoverTarget ? "ring-4 ring-emerald-400 ring-offset-2" : ""
      } ${isDragging ? "opacity-30" : ""}`}
      data-coord-id={node.id}
      onPointerDown={(e) => onCardPointerDown(e, node)}
    >
      <NodeCard
        node={node}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
        onAddChild={handlers.onAddChild}
        onRemoveBoss={handlers.onRemoveBoss}
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
  ...rest
}: { node: OrgNode; childrenByParent: Map<string, OrgNode[]> } & Parameters<typeof Card>[0]) {
  const children = childrenByParent.get(node.id) || [];
  return (
    <li className="org-vbranch-item">
      <Card node={node} {...rest} isHoverTarget={rest.isHoverTarget} />
      {children.length > 0 && (
        <ul className="org-vbranch-list">
          {children.map((child) => (
            <VerticalBranch key={child.id} node={child} childrenByParent={childrenByParent} {...rest} />
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
  ...rest
}: { node: OrgNode; childrenByParent: Map<string, OrgNode[]> } & Parameters<typeof Card>[0]) {
  const children = childrenByParent.get(node.id) || [];
  const deptStyle = getDepartmentStyle(node.department);
  return (
    <li className="org-spine-item">
      <div className={`mb-2 flex w-[240px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm ${deptStyle.header}`}>
        <OrgIcon name={node.iconName} className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{node.department || node.title}</span>
      </div>
      <Card node={node} {...rest} />
      {children.length > 0 && (
        <ul className="org-vbranch-list">
          {children.map((child) => (
            <VerticalBranch key={child.id} node={child} childrenByParent={childrenByParent} {...rest} />
          ))}
        </ul>
      )}
    </li>
  );
}

function RootBranch({
  node,
  childrenByParent,
  ...rest
}: { node: OrgNode; childrenByParent: Map<string, OrgNode[]> } & Parameters<typeof Card>[0]) {
  const children = childrenByParent.get(node.id) || [];
  return (
    <li className="org-spine-item">
      <Card node={node} {...rest} />
      {children.length > 0 && (
        <ul className="org-spine-row">
          {children.map((child) => (
            <SpineColumn key={child.id} node={child} childrenByParent={childrenByParent} {...rest} />
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

function clipToRectEdge(cx: number, cy: number, towardX: number, towardY: number, w: number, h: number): { x: number; y: number } {
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = w / 2;
  const halfH = h / 2;
  const tx = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

export const TreeView = forwardRef<HTMLDivElement, TreeViewProps>(function TreeView(
  {
    nodes,
    onEdit,
    onDelete,
    onAddChild,
    onRemoveBoss,
    highlightedId,
    readOnly,
    compact,
    linkMode,
    onReparent,
    onCoordinationLink,
    onCoordinationStyleToggle,
    onCoordinationLineAdjust,
    onCoordinationUnlink,
  },
  ref
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const reparentDrag = useRef<{ id: string; blockedIds: Set<string> } | null>(null);
  const linkDrag = useRef<{ id: string } | null>(null);
  const coordBendDrag = useRef<{ id: string; targetId: string; grabOffsetX: number; grabOffsetY: number } | null>(null);
  const [, bumpTick] = useState(0);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [reparentHoverId, setReparentHoverId] = useState<string | null>(null);
  const [linkHoverId, setLinkHoverId] = useState<string | null>(null);
  const [linkPreviewPos, setLinkPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [coordSize, setCoordSize] = useState({ width: 0, height: 0 });

  function setRefs(el: HTMLDivElement | null) {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }

  const { roots, childrenByParent, nodesById } = useMemo(() => {
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
    return { roots: rootList, childrenByParent: map, nodesById: new Map(nodes.map((n) => [n.id, n])) };
  }, [nodes]);

  // Coordination lines are measured from the actual rendered card positions (this view
  // has no x/y of its own — cards sit wherever normal document flow puts them), and
  // re-measured on every drag tick so a bend drag redraws live instead of only on drop.
  const coordLines = useMemo<MeasuredCoordLine[]>(() => {
    const containerEl = innerRef.current;
    if (!containerEl) return [];
    const containerRect = containerEl.getBoundingClientRect();
    const next: MeasuredCoordLine[] = [];
    for (const node of nodes) {
      for (const link of node.coordinationLinks || []) {
        const fromEl = containerEl.querySelector(`[data-coord-id="${CSS.escape(node.id)}"]`);
        const toEl = containerEl.querySelector(`[data-coord-id="${CSS.escape(link.targetId)}"]`);
        if (!fromEl || !toEl) continue;
        const a = fromEl.getBoundingClientRect();
        const b = toEl.getBoundingClientRect();
        const cx1 = a.left + a.width / 2 - containerRect.left;
        const cy1 = a.top + a.height / 2 - containerRect.top;
        const cx2 = b.left + b.width / 2 - containerRect.left;
        const cy2 = b.top + b.height / 2 - containerRect.top;
        const p1 = clipToRectEdge(cx1, cy1, cx2, cy2, a.width, a.height);
        const p2 = clipToRectEdge(cx2, cy2, cx1, cy1, b.width, b.height);
        const midX = (p1.x + p2.x) / 2 + (link.offsetX ?? 0);
        const midY = (p1.y + p2.y) / 2 + (link.offsetY ?? 0);
        next.push({ id: node.id, targetId: link.targetId, style: link.style, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, midX, midY });
      }
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, ghostPos, linkPreviewPos]);

  useLayoutEffect(() => {
    const container = innerRef.current;
    if (!container) return;
    function measure() {
      const el = innerRef.current;
      if (!el) return;
      setCoordSize({ width: el.scrollWidth, height: el.scrollHeight });
      bumpTick((v) => v + 1);
    }
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [nodes]);

  function measureDefaultMid(nodeId: string, targetId: string): { x: number; y: number } | null {
    const containerEl = innerRef.current;
    if (!containerEl) return null;
    const fromEl = containerEl.querySelector(`[data-coord-id="${CSS.escape(nodeId)}"]`);
    const toEl = containerEl.querySelector(`[data-coord-id="${CSS.escape(targetId)}"]`);
    if (!fromEl || !toEl) return null;
    const containerRect = containerEl.getBoundingClientRect();
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const cx1 = a.left + a.width / 2 - containerRect.left;
    const cy1 = a.top + a.height / 2 - containerRect.top;
    const cx2 = b.left + b.width / 2 - containerRect.left;
    const cy2 = b.top + b.height / 2 - containerRect.top;
    const p1 = clipToRectEdge(cx1, cy1, cx2, cy2, a.width, a.height);
    const p2 = clipToRectEdge(cx2, cy2, cx1, cy1, b.width, b.height);
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  function handleCardPointerDown(e: React.PointerEvent, node: OrgNode) {
    if (readOnly) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    e.preventDefault();
    document.body.style.userSelect = "none";

    if (e.shiftKey || linkMode) {
      linkDrag.current = { id: node.id };
      setLinkPreviewPos({ x: e.clientX, y: e.clientY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    reparentDrag.current = { id: node.id, blockedIds: getDescendantIds(node.id, nodes) };
    setGhostPos({ x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleCoordBendPointerDown(e: React.PointerEvent, nodeId: string, targetId: string, midX: number, midY: number) {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    document.body.style.userSelect = "none";
    coordBendDrag.current = { id: nodeId, targetId, grabOffsetX: e.clientX - midX, grabOffsetY: e.clientY - midY };
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }

  function hitTest(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY)?.closest("[data-coord-id]") as HTMLElement | null;
    return el?.getAttribute("data-coord-id") || null;
  }

  function handleContainerPointerMove(e: React.PointerEvent) {
    if (linkDrag.current) {
      setLinkPreviewPos({ x: e.clientX, y: e.clientY });
      const hovered = hitTest(e.clientX, e.clientY);
      setLinkHoverId(hovered && hovered !== linkDrag.current.id ? hovered : null);
      return;
    }

    if (coordBendDrag.current) {
      const drag = coordBendDrag.current;
      const node = nodesById.get(drag.id);
      const link = node?.coordinationLinks?.find((l) => l.targetId === drag.targetId);
      const defaultMid = measureDefaultMid(drag.id, drag.targetId);
      if (link && defaultMid) {
        link.offsetX = e.clientX - drag.grabOffsetX - defaultMid.x;
        link.offsetY = e.clientY - drag.grabOffsetY - defaultMid.y;
        bumpTick((v) => v + 1);
      }
      return;
    }

    if (reparentDrag.current) {
      setGhostPos({ x: e.clientX, y: e.clientY });
      const hovered = hitTest(e.clientX, e.clientY);
      const valid = hovered && hovered !== reparentDrag.current.id && !reparentDrag.current.blockedIds.has(hovered);
      setReparentHoverId(valid ? hovered : null);
    }
  }

  function handleContainerPointerUp() {
    if (linkDrag.current) {
      if (linkHoverId) onCoordinationLink?.(linkDrag.current.id, linkHoverId);
      linkDrag.current = null;
      setLinkHoverId(null);
      setLinkPreviewPos(null);
      document.body.style.userSelect = "";
      return;
    }

    if (coordBendDrag.current) {
      const drag = coordBendDrag.current;
      const node = nodesById.get(drag.id);
      const link = node?.coordinationLinks?.find((l) => l.targetId === drag.targetId);
      if (link && link.offsetX !== undefined && link.offsetY !== undefined) {
        onCoordinationLineAdjust?.(drag.id, drag.targetId, link.offsetX, link.offsetY);
      }
      coordBendDrag.current = null;
      document.body.style.userSelect = "";
      return;
    }

    if (reparentDrag.current) {
      if (reparentHoverId) onReparent?.(reparentDrag.current.id, reparentHoverId);
      reparentDrag.current = null;
      setReparentHoverId(null);
      setGhostPos(null);
      document.body.style.userSelect = "";
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No hay nodos que coincidan con los filtros actuales.
      </div>
    );
  }

  const draggedId = reparentDrag.current?.id ?? null;
  const handlers = {
    onEdit,
    onDelete,
    onAddChild,
    onRemoveBoss,
    highlightedId,
    readOnly,
    compact,
    onCardPointerDown: handleCardPointerDown,
  };

  return (
    <div
      ref={setRefs}
      className="org-tree relative min-w-max px-10 py-8"
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerLeave={handleContainerPointerUp}
    >
      <ul className="org-spine-row">
        {roots.map((root) => (
          <RootBranch
            key={root.id}
            node={root}
            childrenByParent={childrenByParent}
            {...handlers}
            isHoverTarget={reparentHoverId === root.id || linkHoverId === root.id}
            isDragging={draggedId === root.id}
          />
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
              <path
                d={`M ${line.x1} ${line.y1} Q ${line.midX} ${line.midY} ${line.x2} ${line.y2}`}
                fill="none"
                stroke="rgba(168,85,247,0.7)"
                strokeWidth={2}
                strokeDasharray={line.style === "dashed" ? "6 4" : undefined}
              />
              {!readOnly && (
                <>
                  <circle
                    cx={line.midX}
                    cy={line.midY}
                    r={7}
                    className="fill-white stroke-sky-400 hover:fill-sky-100"
                    strokeWidth={2}
                    style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
                    onPointerDown={(e) => handleCoordBendPointerDown(e, line.id, line.targetId, line.midX, line.midY)}
                  >
                    <title>Arrastra para curvar esta línea de coordinación</title>
                  </circle>
                  <g
                    transform={`translate(${line.midX - 20}, ${line.midY - 20})`}
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
                    transform={`translate(${line.midX + 20}, ${line.midY - 20})`}
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

      {/* Live preview while shift/link-mode dragging a new coordination line. */}
      {linkDrag.current &&
        linkPreviewPos &&
        (() => {
          const el = innerRef.current?.querySelector(`[data-coord-id="${CSS.escape(linkDrag.current!.id)}"]`);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return (
            <svg className="pointer-events-none fixed left-0 top-0 z-40" width="100vw" height="100vh">
              <line
                x1={rect.left + rect.width / 2}
                y1={rect.top + rect.height / 2}
                x2={linkPreviewPos.x}
                y2={linkPreviewPos.y}
                stroke="rgba(168,85,247,0.6)"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            </svg>
          );
        })()}

      {/* Drag ghost while reparenting — the original card dims in place (see Card's
          isDragging), this floating copy follows the cursor. */}
      {reparentDrag.current &&
        ghostPos &&
        (() => {
          const node = nodesById.get(reparentDrag.current!.id);
          if (!node) return null;
          return (
            <div
              className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2 rotate-2 opacity-90 drop-shadow-xl"
              style={{ left: ghostPos.x, top: ghostPos.y }}
            >
              <NodeCard node={node} onEdit={() => {}} onDelete={() => {}} onAddChild={() => {}} readOnly compact={compact} />
            </div>
          );
        })()}
    </div>
  );
});
