import { forwardRef, useMemo } from "react";
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
}

function Card({ node, ...handlers }: { node: OrgNode } & TreeHandlers) {
  return (
    <div className="inline-block">
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

export const TreeView = forwardRef<HTMLDivElement, TreeViewProps>(function TreeView(
  { nodes, onEdit, onDelete, onAddChild, highlightedId, readOnly, compact },
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

  const handlers = { onEdit, onDelete, onAddChild, highlightedId, readOnly, compact };

  return (
    <div ref={ref} className="org-tree min-w-max px-10 py-8">
      <ul className="org-spine-row">
        {roots.map((root) => (
          <RootBranch key={root.id} node={root} childrenByParent={childrenByParent} {...handlers} />
        ))}
      </ul>
    </div>
  );
});
