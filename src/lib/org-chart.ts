export interface OrgEmployee {
  id: string;
  name: string;
  employeeNumber: string;
  photoUrl: string | null;
  title: string | null;
  departmentName: string | null;
  status: string;
  supervisorId: string | null;
}

export interface OrgTreeNode extends OrgEmployee {
  children: OrgTreeNode[];
}

/** Builds a forest from flat supervisor_id pointers. An employee whose supervisor isn't in the list becomes a root. */
export function buildOrgTree(employees: OrgEmployee[]): OrgTreeNode[] {
  const byId = new Map<string, OrgTreeNode>();
  employees.forEach((e) => byId.set(e.id, { ...e, children: [] }));

  const roots: OrgTreeNode[] = [];
  for (const e of employees) {
    const node = byId.get(e.id)!;
    const supervisor = e.supervisorId && e.supervisorId !== e.id ? byId.get(e.supervisorId) : undefined;
    if (supervisor) {
      supervisor.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function flattenVisible(roots: OrgTreeNode[], collapsed: Set<string>): OrgTreeNode[] {
  const out: OrgTreeNode[] = [];
  function walk(node: OrgTreeNode) {
    out.push(node);
    if (!collapsed.has(node.id)) {
      node.children.forEach(walk);
    }
  }
  roots.forEach(walk);
  return out;
}

export function buildParentMap(roots: OrgTreeNode[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  function walk(node: OrgTreeNode, parent: string | null) {
    map.set(node.id, parent);
    node.children.forEach((c) => walk(c, node.id));
  }
  roots.forEach((r) => walk(r, null));
  return map;
}

export const NODE_WIDTH = 208;
export const NODE_HEIGHT = 122;
const SIBLING_GAP = 32;
const LEVEL_GAP = 96;

export type Orientation = "vertical" | "horizontal";

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
}

/** Simple centered tree layout: leaves get one slot, parents center over their (visible) children. */
export function layoutTree(roots: OrgTreeNode[], collapsed: Set<string>, orientation: Orientation): LayoutResult {
  const widths = new Map<string, number>();

  function visibleChildren(node: OrgTreeNode) {
    return collapsed.has(node.id) ? [] : node.children;
  }

  function computeWidth(node: OrgTreeNode): number {
    const kids = visibleChildren(node);
    if (kids.length === 0) {
      widths.set(node.id, NODE_WIDTH);
      return NODE_WIDTH;
    }
    const total = kids.reduce((sum, c, i) => sum + computeWidth(c) + (i > 0 ? SIBLING_GAP : 0), 0);
    const w = Math.max(total, NODE_WIDTH);
    widths.set(node.id, w);
    return w;
  }

  const positions = new Map<string, { x: number; y: number }>();

  function assign(node: OrgTreeNode, left: number, depth: number) {
    const w = widths.get(node.id)!;
    const primaryCenter = left + w / 2;
    positions.set(
      node.id,
      orientation === "vertical"
        ? { x: primaryCenter - NODE_WIDTH / 2, y: depth * (NODE_HEIGHT + LEVEL_GAP) }
        : { x: depth * (NODE_WIDTH + LEVEL_GAP + 40), y: primaryCenter - NODE_HEIGHT / 2 }
    );

    const kids = visibleChildren(node);
    if (!kids.length) return;
    const kidsTotalWidth = kids.reduce((sum, c, i) => sum + widths.get(c.id)! + (i > 0 ? SIBLING_GAP : 0), 0);
    let cursor = left + (w - kidsTotalWidth) / 2;
    for (const c of kids) {
      assign(c, cursor, depth + 1);
      cursor += widths.get(c.id)! + SIBLING_GAP;
    }
  }

  let cursor = 0;
  for (const root of roots) {
    const w = computeWidth(root);
    assign(root, cursor, 0);
    cursor += w + SIBLING_GAP * 2;
  }

  let maxX = 0;
  let maxY = 0;
  positions.forEach((p) => {
    maxX = Math.max(maxX, p.x + NODE_WIDTH);
    maxY = Math.max(maxY, p.y + NODE_HEIGHT);
  });

  return { positions, width: maxX, height: maxY };
}
