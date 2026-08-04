import { forwardRef, useMemo, useRef, useState } from "react";
import type { OrgNode } from "../types";
import { NodeCard } from "./NodeCard";

const CARD_W = 240;
const CARD_H_FULL = 188;
const CARD_H_COMPACT = 92;
const PADDING = 260;

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
  highlightedId?: string | null;
  readOnly?: boolean;
  compact?: boolean;
}

export const FreeView = forwardRef<HTMLDivElement, FreeViewProps>(function FreeView(
  { nodes, onEdit, onDelete, onAddChild, onNodeMove, onReparent, onLineAdjust, onLineReset, highlightedId, readOnly, compact },
  forwardedRef
) {
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number; blockedIds: Set<string> } | null>(null);
  // offsetX/offsetY here are the pointer's distance from the CURRENT absolute bend point at
  // drag start; defaultAtStart lets each move re-derive a fresh offset-from-default as the
  // connected cards' positions (and therefore the natural midpoint) can differ frame to frame.
  const lineDragState = useRef<{ id: string; grabOffsetX: number; grabOffsetY: number } | null>(null);
  const [, forceRerender] = useState(0);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
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

  function handlePointerDown(e: React.PointerEvent, node: OrgNode) {
    if (readOnly) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    e.preventDefault();
    document.body.style.userSelect = "none";
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
      ref={forwardedRef}
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
              )}
            </g>
          );
        })}
      </svg>

      {nodes.map((node) => (
        <div
          key={node.id}
          className={`absolute transition-shadow ${readOnly ? "" : "cursor-grab active:cursor-grabbing"} ${
            dragState.current?.id === node.id ? "z-30 opacity-90 drop-shadow-lg" : ""
          } ${hoverTargetId === node.id ? "rounded-xl ring-4 ring-emerald-400 ring-offset-2" : ""}`}
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
