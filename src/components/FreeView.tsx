import { forwardRef, useMemo, useRef, useState } from "react";
import type { OrgNode } from "../types";
import { NodeCard } from "./NodeCard";

const CARD_W = 240;
const CARD_H_FULL = 188;
const CARD_H_COMPACT = 92;
const PADDING = 260;

// Point where a ray from a card's center toward another point exits that card's
// rectangle — used so a coordination line (and its control icons) stops at the card's
// edge instead of cutting through it, which would hide the icons under the card next to it.
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

// Every descendant of `nodeId` is an invalid reparent target — dropping a node onto
// its own descendant would create a cycle in the reporting chain.
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

interface FreeViewProps {
  nodes: OrgNode[];
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onReparent?: (id: string, newParentId: string) => void;
  onLineAdjust?: (id: string, offsetX: number, offsetY: number) => void;
  onLineReset?: (id: string) => void;
  onLineDelete?: (id: string) => void;
  onCoordinationLink?: (id: string, targetId: string) => void;
  onCoordinationStyleToggle?: (id: string, targetId: string) => void;
  onCoordinationLineAdjust?: (id: string, targetId: string, offsetX: number, offsetY: number) => void;
  onCoordinationUnlink?: (id: string, targetId: string) => void;
  highlightedId?: string | null;
  readOnly?: boolean;
  compact?: boolean;
  /** When on, every drag creates a coordination line instead of moving the card
   * (Shift+drag also works as a shortcut regardless of this toggle). */
  linkMode?: boolean;
}

export const FreeView = forwardRef<HTMLDivElement, FreeViewProps>(function FreeView(
  {
    nodes,
    onEdit,
    onDelete,
    onAddChild,
    onNodeMove,
    onReparent,
    onLineAdjust,
    onLineReset,
    onLineDelete,
    onCoordinationLink,
    onCoordinationStyleToggle,
    onCoordinationLineAdjust,
    onCoordinationUnlink,
    highlightedId,
    readOnly,
    compact,
    linkMode,
  },
  forwardedRef
) {
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number; blockedIds: Set<string> } | null>(null);
  // grabOffsetX/Y is the pointer's distance from the CURRENT absolute bend point at drag
  // start; each move re-derives a fresh offset-from-default since the connected cards'
  // live positions (and therefore the natural midpoint) can shift frame to frame.
  const lineDragState = useRef<{ id: string; grabOffsetX: number; grabOffsetY: number } | null>(null);
  // Same idea as lineDragState, but for bending an existing coordination line.
  const coordLineDragState = useRef<{ id: string; targetId: string; grabOffsetX: number; grabOffsetY: number } | null>(null);
  // Shift+drag (or Conectar líneas mode) from a card draws a dotted coordination line to
  // whatever card it's released on, instead of moving the card.
  const linkDragState = useRef<{ id: string } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [, forceRerender] = useState(0);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [linkHoverId, setLinkHoverId] = useState<string | null>(null);
  const [linkPreviewPos, setLinkPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const CARD_H = compact ? CARD_H_COMPACT : CARD_H_FULL;

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const bounds = useMemo(() => {
    let maxX = 800;
    let maxY = 600;
    for (const n of nodes) {
      maxX = Math.max(maxX, n.freeX + CARD_W);
      maxY = Math.max(maxY, n.freeY + CARD_H);
    }
    return { width: maxX + PADDING, height: maxY + PADDING };
  }, [nodes, CARD_H]);

  function setRootRef(el: HTMLDivElement | null) {
    rootRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }

  function handlePointerDown(e: React.PointerEvent, node: OrgNode) {
    if (readOnly) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    e.preventDefault();
    document.body.style.userSelect = "none";

    if (e.shiftKey || linkMode) {
      linkDragState.current = { id: node.id };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    dragState.current = {
      id: node.id,
      offsetX: e.clientX - node.freeX,
      offsetY: e.clientY - node.freeY,
      blockedIds: getDescendantIds(node.id, nodes),
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  // The connector's natural (no manual bend) midpoint, recomputed from the two cards'
  // LIVE positions — this is what a stored offset is relative to.
  function getDefaultMid(node: OrgNode): { x: number; y: number } | null {
    if (!node.parentId) return null;
    const parent = nodesById.get(node.parentId);
    if (!parent) return null;
    const x1 = parent.freeX + CARD_W / 2;
    const y1 = parent.freeY + CARD_H;
    const x2 = node.freeX + CARD_W / 2;
    const y2 = node.freeY;
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }

  // Same idea as getDefaultMid, but edge-to-edge (via clipToRectEdge) since a coordination
  // line can run between any two cards, not just a vertically-stacked parent/child pair.
  function getCoordDefaultMid(node: OrgNode, target: OrgNode): { x: number; y: number } {
    const cx1 = node.freeX + CARD_W / 2;
    const cy1 = node.freeY + CARD_H / 2;
    const cx2 = target.freeX + CARD_W / 2;
    const cy2 = target.freeY + CARD_H / 2;
    const p1 = clipToRectEdge(cx1, cy1, cx2, cy2, CARD_W, CARD_H);
    const p2 = clipToRectEdge(cx2, cy2, cx1, cy1, CARD_W, CARD_H);
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  function handleCoordLinePointerDown(e: React.PointerEvent, nodeId: string, targetId: string, midX: number, midY: number) {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    document.body.style.userSelect = "none";
    coordLineDragState.current = { id: nodeId, targetId, grabOffsetX: e.clientX - midX, grabOffsetY: e.clientY - midY };
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }

  function handleLinePointerDown(e: React.PointerEvent, nodeId: string, midX: number, midY: number) {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    document.body.style.userSelect = "none";
    lineDragState.current = { id: nodeId, grabOffsetX: e.clientX - midX, grabOffsetY: e.clientY - midY };
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }

  function handleLineDoubleClick(e: React.MouseEvent, nodeId: string) {
    if (readOnly) return;
    e.stopPropagation();
    const node = nodesById.get(nodeId);
    if (node) {
      node.lineOffsetX = undefined;
      node.lineOffsetY = undefined;
      forceRerender((v) => v + 1);
    }
    onLineReset?.(nodeId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (linkDragState.current) {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      setLinkPreviewPos({ x: localX, y: localY });
      let hovered: string | null = null;
      for (const other of nodes) {
        if (other.id === linkDragState.current.id) continue;
        if (localX >= other.freeX && localX <= other.freeX + CARD_W && localY >= other.freeY && localY <= other.freeY + CARD_H) {
          hovered = other.id;
          break;
        }
      }
      setLinkHoverId(hovered);
      return;
    }

    const coordDrag = coordLineDragState.current;
    if (coordDrag) {
      const node = nodesById.get(coordDrag.id);
      const target = nodesById.get(coordDrag.targetId);
      if (node && target) {
        const defaultMid = getCoordDefaultMid(node, target);
        const absMidX = e.clientX - coordDrag.grabOffsetX;
        const absMidY = e.clientY - coordDrag.grabOffsetY;
        const link = (node.coordinationLinks || []).find((l) => l.targetId === coordDrag.targetId);
        if (link) {
          link.offsetX = absMidX - defaultMid.x;
          link.offsetY = absMidY - defaultMid.y;
          forceRerender((v) => v + 1);
        }
      }
      return;
    }

    const lineDrag = lineDragState.current;
    if (lineDrag) {
      const node = nodesById.get(lineDrag.id);
      const defaultMid = node ? getDefaultMid(node) : null;
      if (node && defaultMid) {
        const absMidX = e.clientX - lineDrag.grabOffsetX;
        const absMidY = e.clientY - lineDrag.grabOffsetY;
        node.lineOffsetX = absMidX - defaultMid.x;
        node.lineOffsetY = absMidY - defaultMid.y;
        forceRerender((v) => v + 1);
      }
      return;
    }

    const drag = dragState.current;
    if (!drag) return;
    const node = nodesById.get(drag.id);
    if (!node) return;
    const nextX = Math.max(0, e.clientX - drag.offsetX);
    const nextY = Math.max(0, e.clientY - drag.offsetY);
    node.freeX = nextX;
    node.freeY = nextY;

    // Drop the dragged card's center onto another card to reassign its reporting line.
    const cx = nextX + CARD_W / 2;
    const cy = nextY + CARD_H / 2;
    let hovered: string | null = null;
    for (const other of nodes) {
      if (other.id === node.id || drag.blockedIds.has(other.id)) continue;
      if (cx >= other.freeX && cx <= other.freeX + CARD_W && cy >= other.freeY && cy <= other.freeY + CARD_H) {
        hovered = other.id;
        break;
      }
    }
    setHoverTargetId(hovered);
    forceRerender((v) => v + 1);
  }

  function handlePointerUp() {
    if (linkDragState.current) {
      const sourceId = linkDragState.current.id;
      if (linkHoverId && linkHoverId !== sourceId) {
        onCoordinationLink?.(sourceId, linkHoverId);
      }
      linkDragState.current = null;
      setLinkHoverId(null);
      setLinkPreviewPos(null);
      document.body.style.userSelect = "";
      return;
    }

    if (coordLineDragState.current) {
      const drag = coordLineDragState.current;
      const node = nodesById.get(drag.id);
      const link = node?.coordinationLinks?.find((l) => l.targetId === drag.targetId);
      if (link && link.offsetX !== undefined && link.offsetY !== undefined) {
        onCoordinationLineAdjust?.(drag.id, drag.targetId, link.offsetX, link.offsetY);
      }
      document.body.style.userSelect = "";
      coordLineDragState.current = null;
      return;
    }

    if (lineDragState.current) {
      const drag = lineDragState.current;
      const node = nodesById.get(drag.id);
      if (node && node.lineOffsetX !== undefined && node.lineOffsetY !== undefined) {
        onLineAdjust?.(node.id, node.lineOffsetX, node.lineOffsetY);
      }
      document.body.style.userSelect = "";
      lineDragState.current = null;
      return;
    }

    if (dragState.current) {
      const drag = dragState.current;
      const node = nodesById.get(drag.id);
      if (node) {
        onNodeMove(node.id, node.freeX, node.freeY);
        if (hoverTargetId && hoverTargetId !== node.parentId && onReparent) {
          onReparent(node.id, hoverTargetId);
        }
      }
      document.body.style.userSelect = "";
    }
    dragState.current = null;
    setHoverTargetId(null);
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No hay nodos que coincidan con los filtros actuales.
      </div>
    );
  }

  return (
    <div
      ref={setRootRef}
      className="relative"
      style={{ width: bounds.width, height: bounds.height }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg className="pointer-events-none absolute inset-0" width={bounds.width} height={bounds.height}>
        {nodes.map((node) => {
          if (!node.parentId) return null;
          const parent = nodesById.get(node.parentId);
          if (!parent) return null;
          const x1 = parent.freeX + CARD_W / 2;
          const y1 = parent.freeY + CARD_H;
          const x2 = node.freeX + CARD_W / 2;
          const y2 = node.freeY;
          const midX = (x1 + x2) / 2 + (node.lineOffsetX ?? 0);
          const midY = (y1 + y2) / 2 + (node.lineOffsetY ?? 0);
          return (
            <g key={node.id}>
              <path d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`} fill="none" stroke="rgba(100,116,139,0.35)" strokeWidth={2} />
              {!readOnly && (
                <>
                  <circle
                    cx={midX}
                    cy={midY}
                    r={7}
                    className="fill-white stroke-sky-400 hover:fill-sky-100"
                    strokeWidth={2}
                    style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
                    onPointerDown={(e) => handleLinePointerDown(e, node.id, midX, midY)}
                    onDoubleClick={(e) => handleLineDoubleClick(e, node.id)}
                  >
                    <title>Arrastra para curvar esta conexión (doble clic para restablecer)</title>
                  </circle>
                  <g
                    transform={`translate(${midX + 18}, ${midY - 18})`}
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                    onClick={() => onLineDelete?.(node.id)}
                  >
                    <circle r={7} className="fill-white stroke-rose-400 hover:fill-rose-50" strokeWidth={2} />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={10} className="select-none fill-rose-500">
                      ×
                    </text>
                    <title>Quitar esta línea (el nodo queda sin jefe)</title>
                  </g>
                </>
              )}
            </g>
          );
        })}

        {/* Functional-coordination lines — independent of the reporting hierarchy. Each
            picks its own solid/dashed style (toggle button next to the delete button). */}
        {nodes.flatMap((node) =>
          (node.coordinationLinks || []).map((link) => {
            const target = nodesById.get(link.targetId);
            if (!target) return null;
            const cx1 = node.freeX + CARD_W / 2;
            const cy1 = node.freeY + CARD_H / 2;
            const cx2 = target.freeX + CARD_W / 2;
            const cy2 = target.freeY + CARD_H / 2;
            // Stop each end at its card's edge (not center) so close-together cards never
            // bury the line — or its control icons — underneath the neighboring card.
            const p1 = clipToRectEdge(cx1, cy1, cx2, cy2, CARD_W, CARD_H);
            const p2 = clipToRectEdge(cx2, cy2, cx1, cy1, CARD_W, CARD_H);
            const x1 = p1.x;
            const y1 = p1.y;
            const x2 = p2.x;
            const y2 = p2.y;
            const midX = (x1 + x2) / 2 + (link.offsetX ?? 0);
            const midY = (y1 + y2) / 2 + (link.offsetY ?? 0);
            return (
              <g key={`${node.id}->${link.targetId}`}>
                <path
                  d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                  fill="none"
                  stroke="rgba(168,85,247,0.7)"
                  strokeWidth={2}
                  strokeDasharray={link.style === "dashed" ? "6 4" : undefined}
                />
                {!readOnly && (
                  <>
                    <circle
                      cx={midX}
                      cy={midY}
                      r={7}
                      className="fill-white stroke-sky-400 hover:fill-sky-100"
                      strokeWidth={2}
                      style={{ pointerEvents: "auto", cursor: "grab", touchAction: "none" }}
                      onPointerDown={(e) => handleCoordLinePointerDown(e, node.id, link.targetId, midX, midY)}
                    >
                      <title>Arrastra para curvar esta línea de coordinación</title>
                    </circle>
                    <g
                      transform={`translate(${midX - 20}, ${midY - 20})`}
                      style={{ pointerEvents: "auto", cursor: "pointer" }}
                      onClick={() => onCoordinationStyleToggle?.(node.id, link.targetId)}
                    >
                      <circle r={7} className="fill-white stroke-slate-400 hover:fill-slate-50" strokeWidth={2} />
                      <line
                        x1={-3.5}
                        y1={0}
                        x2={3.5}
                        y2={0}
                        stroke="rgb(100,116,139)"
                        strokeWidth={1.5}
                        strokeDasharray={link.style === "dashed" ? "2 1.5" : undefined}
                      />
                      <title>{link.style === "dashed" ? "Cambiar a línea continua" : "Cambiar a línea punteada"}</title>
                    </g>
                    <g
                      transform={`translate(${midX + 20}, ${midY - 20})`}
                      style={{ pointerEvents: "auto", cursor: "pointer" }}
                      onClick={() => onCoordinationUnlink?.(node.id, link.targetId)}
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
            );
          })
        )}

        {/* Live preview while shift-dragging a new coordination line. */}
        {linkDragState.current &&
          linkPreviewPos &&
          (() => {
            const source = nodesById.get(linkDragState.current!.id);
            if (!source) return null;
            const x1 = source.freeX + CARD_W / 2;
            const y1 = source.freeY + CARD_H / 2;
            return (
              <line
                x1={x1}
                y1={y1}
                x2={linkPreviewPos.x}
                y2={linkPreviewPos.y}
                stroke="rgba(168,85,247,0.6)"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            );
          })()}
      </svg>

      {nodes.map((node) => (
        <div
          key={node.id}
          className={`absolute transition-shadow ${readOnly ? "" : linkMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"} ${
            dragState.current?.id === node.id ? "z-30 opacity-90 drop-shadow-lg" : ""
          } ${hoverTargetId === node.id ? "rounded-xl ring-4 ring-emerald-400 ring-offset-2" : ""} ${
            linkHoverId === node.id ? "rounded-xl ring-4 ring-purple-400 ring-offset-2" : ""
          }`}
          style={{ left: node.freeX, top: node.freeY, touchAction: "none" }}
          onPointerDown={(e) => handlePointerDown(e, node)}
        >
          <NodeCard
            node={node}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            highlighted={highlightedId === node.id}
            readOnly={readOnly}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
});
