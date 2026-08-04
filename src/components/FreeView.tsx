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
  highlightedId?: string | null;
  readOnly?: boolean;
  compact?: boolean;
}

export const FreeView = forwardRef<HTMLDivElement, FreeViewProps>(function FreeView(
  { nodes, onEdit, onDelete, onAddChild, onNodeMove, onReparent, highlightedId, readOnly, compact },
  forwardedRef
) {
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number; blockedIds: Set<string> } | null>(null);
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

  function handlePointerMove(e: React.PointerEvent) {
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
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={node.id}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke="rgba(100,116,139,0.35)"
              strokeWidth={2}
            />
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
