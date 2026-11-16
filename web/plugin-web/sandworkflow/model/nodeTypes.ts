import { NODE_TYPE, type FlowNode } from '../api/types';

/**
 * 节点类型元信息与新建默认节点。界面只提供后端真能发布的类型：
 * 白名单 {0,1,2,3,4,5,9}，type=6（触发器）后端拒收，不给入口。
 */

/** 链上「+」可插入的节点类型：审批人/办理人/抄送人/排他网关。 */
export const INSERTABLE_NODE_TYPES = [
  NODE_TYPE.APPROVE,
  NODE_TYPE.TRANSACT,
  NODE_TYPE.COPY,
  NODE_TYPE.EXCLUSIVE_GATEWAY,
] as const;

const NODE_TYPE_LABELS: Record<number, string> = {
  [NODE_TYPE.START]: '发起',
  [NODE_TYPE.APPROVE]: '审批人',
  [NODE_TYPE.COPY]: '抄送人',
  [NODE_TYPE.CONDITION]: '条件分支',
  [NODE_TYPE.EXCLUSIVE_GATEWAY]: '排他网关',
  [NODE_TYPE.TRANSACT]: '办理人',
  [NODE_TYPE.TRIGGER]: '触发器',
  [NODE_TYPE.END]: '结束',
};

export function nodeTypeLabel(type: number): string {
  return NODE_TYPE_LABELS[type] ?? `不支持节点(${type})`;
}

export function isSupportedNodeType(type: number): boolean {
  return type in NODE_TYPE_LABELS && type !== NODE_TYPE.TRIGGER;
}

/** 该节点类型能否从链上删除：根节点固定不可删。 */
export function isRemovableNode(node: FlowNode): boolean {
  return node.type !== NODE_TYPE.START;
}

/** 分支（type=3）是否默认分支：conditionGroups 空数组或缺失。 */
export function isDefaultBranch(branch: FlowNode): boolean {
  return !Array.isArray(branch.conditionGroups) || branch.conditionGroups.length === 0;
}

let seq = 0;

/**
 * 生成编辑器内会话级节点标识，写在编辑器私有键 `__editorKey` 上，
 * 发布前由 definitionCodec 剥掉，不进后端数据。
 * id/nodeId/choiceKey/relationKey 一律不自产，留后端发布时补发。
 */
export function genEditorKey(): string {
  seq += 1;
  return `ek_${Date.now().toString(36)}_${seq}`;
}

/** React key / 选中态用的稳定标识：编辑键优先，老数据回落既有 id。 */
export function nodeKeyOf(node: FlowNode): string {
  const editorKey = node.__editorKey;
  if (typeof editorKey === 'string' && editorKey !== '') {
    return editorKey;
  }
  if (typeof node.id === 'string' && node.id !== '') {
    return node.id;
  }
  if (typeof node.nodeId === 'string' && node.nodeId !== '') {
    return node.nodeId;
  }
  return '';
}

function createBranchNode(index: number, isDefault: boolean): FlowNode {
  const node: FlowNode = {
    type: NODE_TYPE.CONDITION,
    name: isDefault ? '默认分支' : `分支${index}`,
    __editorKey: genEditorKey(),
    childNode: null,
  };
  if (!isDefault) {
    node.conditionGroups = [{ conditions: [] }];
  }
  return node;
}

/** 各类型的新建默认节点；条件分支节点不从这里产出（经网关创建）。 */
export function createNode(type: number): FlowNode {
  const base: FlowNode = { type, __editorKey: genEditorKey(), childNode: null };
  switch (type) {
    case NODE_TYPE.APPROVE:
      return {
        ...base,
        name: '审批人',
        assignees: [],
        multiInstanceApprovalType: 0,
        signable: 0,
        backable: 0,
      };
    case NODE_TYPE.TRANSACT:
      return {
        ...base,
        name: '办理人',
        transactors: [],
        multiInstanceApprovalType: 0,
        signable: 0,
        backable: 0,
      };
    case NODE_TYPE.COPY:
      return { ...base, name: '抄送人', ccs: [] };
    case NODE_TYPE.EXCLUSIVE_GATEWAY:
      return {
        ...base,
        name: '条件分支',
        // 默认分支固定排最后（后端校验硬约束）。
        conditionNodes: [createBranchNode(1, false), createBranchNode(2, true)],
      };
    case NODE_TYPE.END:
      return { ...base, name: '结束' };
    default:
      return { ...base, name: nodeTypeLabel(type) };
  }
}

/** 新增分支：默认分支（若有）必须仍在最后，所以插到它前面。 */
export function createBranch(existing: FlowNode[]): FlowNode {
  return createBranchNode(existing.length + 1, false);
}

export function createRootNode(): FlowNode {
  return {
    type: NODE_TYPE.START,
    name: '发起',
    __editorKey: genEditorKey(),
    childNode: null,
  };
}
