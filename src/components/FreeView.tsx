import { forwardRef, useMemo, useRef, useState } from "react";
import type { OrgNode } from "../types";
import { NodeCard } from "./NodeCard";

const CARD_W = 240;
const CARD_H = 188;
const PADDING = 260;

interface FreeViewProps {
  nodes: OrgNode[];
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  highlightedId?: string | null;
  readOnly?: boolean;
}

export const FreeView = forwardRef<HTMLDivElement, FreeViewProps>(function FreeView(
  { nodes, onEdit, onDelete, onAddChild, onNodeMove, highlightedId, readOnly },
  forwardedRef
) {
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [, forceRerender] = useState(0);

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const bounds = useMemo(() => {
    let maxX = 800;
    let maxY = 600;
    for (const n of nodes) {
      maxX = Math.max(maxX, n.freeX + CARD_W);
      maxY = Math.max(maxY, n.freeY + CARD_H);
    }
    return { width: maxX + PADDING, height: maxY + PADDING };
  }, [nodes]);

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
    forceRerender((v) => v + 1);
  }

  function handlePointerUp() {
    if (dragState.current) {
      const drag = dragState.current;
      const node = nodesById.get(drag.id);
      if (node) onNodeMove(node.id, node.freeX, node.freeY);
      document.body.style.userSelect = "";
    }
    dragState.current = null;
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
          className={readOnly ? "absolute" : "absolute cursor-grab active:cursor-grabbing"}
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
          />
        </div>
      ))}
    </div>
  );
});
