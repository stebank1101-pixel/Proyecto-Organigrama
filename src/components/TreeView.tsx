import { forwardRef, useMemo } from "react";
import type { OrgNode } from "../types";
import { NodeCard } from "./NodeCard";

interface TreeViewProps {
  nodes: OrgNode[];
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  highlightedId?: string | null;
}

function TreeBranch({
  node,
  childrenByParent,
  ...handlers
}: {
  node: OrgNode;
  childrenByParent: Map<string, OrgNode[]>;
  onEdit: (node: OrgNode) => void;
  onDelete: (node: OrgNode) => void;
  onAddChild: (parent: OrgNode) => void;
  highlightedId?: string | null;
}) {
  const children = childrenByParent.get(node.id) || [];
  return (
    <li>
      <div className="inline-block">
        <NodeCard
          node={node}
          onEdit={handlers.onEdit}
          onDelete={handlers.onDelete}
          onAddChild={handlers.onAddChild}
          highlighted={handlers.highlightedId === node.id}
        />
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <TreeBranch key={child.id} node={child} childrenByParent={childrenByParent} {...handlers} />
          ))}
        </ul>
      )}
    </li>
  );
}

export const TreeView = forwardRef<HTMLDivElement, TreeViewProps>(function TreeView(
  { nodes, onEdit, onDelete, onAddChild, highlightedId },
  ref
) {
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

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No hay nodos que coincidan con los filtros actuales.
      </div>
    );
  }

  return (
    <div ref={ref} className="org-tree min-w-max px-10 py-8">
      <ul>
        {roots.map((root) => (
          <TreeBranch
            key={root.id}
            node={root}
            childrenByParent={childrenByParent}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            highlightedId={highlightedId}
          />
        ))}
      </ul>
    </div>
  );
});
