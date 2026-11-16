import type { FlowNode } from '../api/types';
import { NODE_TYPE } from '../api/types';
import { isDefaultBranch, nodeKeyOf } from './nodeTypes';

/**
 * nodeConfig 树的不可变操作：所有函数返回新树，不改动入参。
 * 节点身份用 nodeKeyOf（编辑键 → id → nodeId 顺序取），
 * 插入位置一律表达为「接在某节点的 childNode 指针后面」，
 * 这一条规则同时覆盖链中、链尾与分支空链三种情况。
 */

/** 先对节点应用 fn，再深入 childNode 与 conditionNodes；返回是否产生替换的引用比较结果。 */
function mapNode(node: FlowNode, fn: (n: FlowNode) => FlowNode): FlowNode {
  let next = fn(node);
  if (next.childNode) {
    const child = mapNode(next.childNode, fn);
    if (child !== next.childNode) {
      next = { ...next, childNode: child };
    }
  }
  if (next.conditionNodes) {
    const branches = next.conditionNodes.map((branch) => mapNode(branch, fn));
    if (branches.some((branch, index) => branch !== next.conditionNodes?.[index])) {
      next = { ...next, conditionNodes: branches };
    }
  }
  return next;
}

export function walkNodes(
  node: FlowNode,
  visit: (node: FlowNode, parent: FlowNode | null) => void,
  parent: FlowNode | null = null,
): void {
  visit(node, parent);
  if (node.childNode) {
    walkNodes(node.childNode, visit, node);
  }
  for (const branch of node.conditionNodes ?? []) {
    walkNodes(branch, visit, node);
  }
}

export function findNode(root: FlowNode, key: string): FlowNode | null {
  let hit: FlowNode | null = null;
  walkNodes(root, (node) => {
    if (hit === null && nodeKeyOf(node) === key) {
      hit = node;
    }
  });
  return hit;
}

/** 在目标节点的 childNode 位置插入新节点：新节点接上原来的后继。 */
export function insertAfter(root: FlowNode, afterKey: string, node: FlowNode): FlowNode {
  return mapNode(root, (n) => {
    if (nodeKeyOf(n) !== afterKey) {
      return n;
    }
    const inserted: FlowNode = { ...node, childNode: n.childNode ?? null };
    return { ...n, childNode: inserted };
  });
}

/** 摘下节点并把后继接回父链；分支则从 conditionNodes 数组移除；根节点不可经此删除。 */
export function removeNode(root: FlowNode, key: string): FlowNode {
  return mapNode(root, (n) => {
    let next = n;
    if (next.childNode && nodeKeyOf(next.childNode) === key) {
      next = { ...next, childNode: next.childNode.childNode ?? null };
    }
    if (next.conditionNodes?.some((branch) => nodeKeyOf(branch) === key)) {
      next = {
        ...next,
        conditionNodes: next.conditionNodes.filter((branch) => nodeKeyOf(branch) !== key),
      };
    }
    return next;
  });
}

export function updateNode(root: FlowNode, key: string, patch: Partial<FlowNode>): FlowNode {
  return mapNode(root, (n) => (nodeKeyOf(n) === key ? { ...n, ...patch } : n));
}

/** 新增分支：默认分支必须保持在最后，新分支插到它前面。 */
export function addBranch(root: FlowNode, gatewayKey: string, branch: FlowNode): FlowNode {
  return mapNode(root, (n) => {
    if (nodeKeyOf(n) !== gatewayKey || !Array.isArray(n.conditionNodes)) {
      return n;
    }
    const branches = [...n.conditionNodes];
    const last = branches[branches.length - 1];
    if (last && isDefaultBranch(last)) {
      branches.splice(branches.length - 1, 0, branch);
    } else {
      branches.push(branch);
    }
    return { ...n, conditionNodes: branches };
  });
}

/** 删除分支：后端要求 conditionNodes ≥2，剩 2 条时不再删。 */
export function removeBranch(root: FlowNode, gatewayKey: string, branchKey: string): FlowNode {
  return mapNode(root, (n) => {
    if (
      nodeKeyOf(n) !== gatewayKey ||
      !Array.isArray(n.conditionNodes) ||
      n.conditionNodes.length <= 2
    ) {
      return n;
    }
    return {
      ...n,
      conditionNodes: n.conditionNodes.filter((branch) => nodeKeyOf(branch) !== branchKey),
    };
  });
}

/**
 * 分支左/右移一位调优先级（网关按数组顺序取第一个命中分支）。
 * 默认分支锁在最后：它自己不能动，别的分支也不能越过它排到后面。
 */
export function moveBranch(
  root: FlowNode,
  gatewayKey: string,
  branchKey: string,
  offset: number,
): FlowNode {
  return mapNode(root, (n) => {
    if (nodeKeyOf(n) !== gatewayKey || !Array.isArray(n.conditionNodes)) {
      return n;
    }
    const branches = [...n.conditionNodes];
    const index = branches.findIndex((branch) => nodeKeyOf(branch) === branchKey);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= branches.length) {
      return n;
    }
    const branch = branches[index];
    const swap = branches[target];
    if (!branch || !swap || isDefaultBranch(branch) || isDefaultBranch(swap)) {
      return n;
    }
    branches[index] = swap;
    branches[target] = branch;
    return { ...n, conditionNodes: branches };
  });
}

export function treeDepth(root: FlowNode): number {
  const branchDepths = (root.conditionNodes ?? []).map((branch) => treeDepth(branch));
  const deepest = Math.max(0, ...branchDepths);
  const childDepth = root.childNode ? treeDepth(root.childNode) : 0;
  return 1 + Math.max(deepest, childDepth);
}

export function countNodes(root: FlowNode): number {
  let total = 0;
  walkNodes(root, () => {
    total += 1;
  });
  return total;
}

/** 发布硬约束之一：全树至少一个审批（1）或办理（5）节点。 */
export function hasWorkerNode(root: FlowNode): boolean {
  let found = false;
  walkNodes(root, (node) => {
    if (node.type === NODE_TYPE.APPROVE || node.type === NODE_TYPE.TRANSACT) {
      found = true;
    }
  });
  return found;
}

/** 主链尾节点：画布决定要不要追加「流程结束」展示标记。 */
export function chainTail(root: FlowNode): FlowNode {
  let current = root;
  while (current.childNode) {
    current = current.childNode;
  }
  return current;
}
