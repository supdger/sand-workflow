import type { OrgDept } from '../../api/types';

/** TreeSelect 需要的树节点形态（key/value/label/children）。 */
export interface DeptTreeNode {
  key: string;
  value: number;
  label: string;
  children?: DeptTreeNode[];
}

/** parent_id 向上走，回到起点或走到不存在/空父级都算成环或断链。 */
function createsCycle(dept: OrgDept, byId: Map<number, OrgDept>): boolean {
  const seen = new Set<number>([dept.id]);
  let parentId = dept.parent_id;
  while (parentId !== null && parentId !== 0) {
    if (seen.has(parentId)) {
      return true;
    }
    seen.add(parentId);
    parentId = byId.get(parentId)?.parent_id ?? null;
  }
  return false;
}

/**
 * listDepts 返回平铺部门（含 parent_id），前端自组树。
 * parent_id 为空/为 0/指向不存在部门/会造成环的，都按根节点处理，
 * 防止脏数据产出循环树把渲染卡死。
 */
export function buildDeptTree(depts: OrgDept[]): DeptTreeNode[] {
  const byId = new Map<number, OrgDept>();
  for (const dept of depts) {
    byId.set(dept.id, dept);
  }
  const nodes = new Map<number, DeptTreeNode>();
  for (const dept of depts) {
    nodes.set(dept.id, { key: String(dept.id), value: dept.id, label: dept.name });
  }
  const roots: DeptTreeNode[] = [];
  for (const dept of depts) {
    const node = nodes.get(dept.id);
    if (!node) {
      continue;
    }
    const parent =
      dept.parent_id !== null && dept.parent_id !== 0 && !createsCycle(dept, byId)
        ? nodes.get(dept.parent_id)
        : undefined;
    if (parent) {
      parent.children = [...(parent.children ?? []), node];
    } else {
      roots.push(node);
    }
  }
  return roots;
}
