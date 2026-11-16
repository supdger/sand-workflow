import { describe, expect, it } from 'vitest';

import type { FlowNode } from '../api/types';
import { NODE_TYPE } from '../api/types';
import {
  addBranch,
  chainTail,
  countNodes,
  findNode,
  hasWorkerNode,
  insertAfter,
  moveBranch,
  removeBranch,
  removeNode,
  treeDepth,
  updateNode,
  walkNodes,
} from './nodeTree';
import { nodeKeyOf } from './nodeTypes';

/** 造一个用 id 做标识的节点（nodeKeyOf 回落 id）。 */
function node(id: string, type: number = NODE_TYPE.APPROVE, extra: Partial<FlowNode> = {}): FlowNode {
  return { type, id, childNode: null, ...extra };
}

/** A → B → C 的直链，挂到发起节点下。 */
function straightChain(): FlowNode {
  return node('root', NODE_TYPE.START, {
    childNode: node('A', NODE_TYPE.APPROVE, {
      childNode: node('B', NODE_TYPE.COPY, {
        childNode: node('C', NODE_TYPE.END),
      }),
    }),
  });
}

/** 两条分支：条件分支 b1 + 默认分支 def，都挂空链。 */
function gateway(id: string, branches: FlowNode[]): FlowNode {
  return node(id, NODE_TYPE.EXCLUSIVE_GATEWAY, { conditionNodes: branches });
}

function branch(id: string, isDefault = false): FlowNode {
  return node(id, NODE_TYPE.CONDITION, {
    conditionGroups: isDefault ? [] : [{ conditions: [{ varName: 'x', operator: 12, val: 'a' }] }],
  });
}

describe('nodeTree', () => {
  it('insertAfter 把新节点接在目标节点与后继之间', () => {
    const root = straightChain();
    const next = insertAfter(root, 'B', node('X'));
    const b = findNode(next, 'B');
    expect(nodeKeyOf(b?.childNode ?? {} as FlowNode)).toBe('X');
    expect(nodeKeyOf(b?.childNode?.childNode ?? {} as FlowNode)).toBe('C');
    // 原树不被改动。
    expect(nodeKeyOf(findNode(root, 'B')?.childNode ?? {} as FlowNode)).toBe('C');
  });

  it('insertAfter 接在链尾与分支空链后面', () => {
    const root = straightChain();
    const tailed = insertAfter(root, 'C', node('X'));
    expect(nodeKeyOf(chainTail(tailed))).toBe('X');
    expect(findNode(tailed, 'X')?.childNode).toBeNull();

    const withGateway = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [branch('b1'), branch('def', true)]),
    });
    const branched = insertAfter(withGateway, 'b1', node('X'));
    expect(nodeKeyOf(findNode(branched, 'b1')?.childNode ?? {} as FlowNode)).toBe('X');
  });

  it('removeNode 摘掉链中节点并把后继接回去', () => {
    const root = straightChain();
    const next = removeNode(root, 'B');
    expect(nodeKeyOf(findNode(next, 'A')?.childNode ?? {} as FlowNode)).toBe('C');
    expect(findNode(next, 'B')).toBeNull();
  });

  it('removeNode 从 conditionNodes 里移除整条分支，根节点不可删', () => {
    const root = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [branch('b1'), branch('b2'), branch('def', true)]),
    });
    const next = removeNode(root, 'b2');
    const gw = findNode(next, 'gw');
    expect(gw?.conditionNodes?.map((b) => nodeKeyOf(b))).toEqual(['b1', 'def']);

    // 传根节点自己的 key：根不在任何 childNode/conditionNodes 里，原样返回。
    const same = removeNode(root, 'root');
    expect(countNodes(same)).toBe(countNodes(root));
    expect(same).toEqual(root);
  });

  it('updateNode 只改目标节点、其余分支引用不变', () => {
    const root = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [branch('b1'), branch('def', true)]),
    });
    const next = updateNode(root, 'b1', { name: '新分支名' });
    expect(findNode(next, 'b1')?.name).toBe('新分支名');
    expect(findNode(next, 'def')).toBe(findNode(root, 'def'));
  });

  it('addBranch 把新分支插到默认分支前面，无默认分支时追加末尾', () => {
    const root = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [branch('b1'), branch('def', true)]),
    });
    const next = addBranch(root, 'gw', branch('b2'));
    expect(findNode(next, 'gw')?.conditionNodes?.map((b) => nodeKeyOf(b))).toEqual([
      'b1',
      'b2',
      'def',
    ]);

    const noDefault = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [branch('b1'), branch('b2')]),
    });
    const appended = addBranch(noDefault, 'gw', branch('b3'));
    expect(findNode(appended, 'gw')?.conditionNodes?.map((b) => nodeKeyOf(b))).toEqual([
      'b1',
      'b2',
      'b3',
    ]);
  });

  it('removeBranch 剩两条时不再删，多于两条正常删', () => {
    const two = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [branch('b1'), branch('def', true)]),
    });
    const kept = removeBranch(two, 'gw', 'b1');
    expect(findNode(kept, 'gw')?.conditionNodes).toHaveLength(2);

    const three = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [branch('b1'), branch('b2'), branch('def', true)]),
    });
    const next = removeBranch(three, 'gw', 'b1');
    expect(findNode(next, 'gw')?.conditionNodes?.map((b) => nodeKeyOf(b))).toEqual([
      'b2',
      'def',
    ]);
  });

  it('moveBranch 正常换位，默认分支既不能动也不能被越过', () => {
    const root = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [
        branch('b1'),
        branch('b2'),
        branch('b3'),
        branch('def', true),
      ]),
    });
    const moved = moveBranch(root, 'gw', 'b1', 1);
    expect(findNode(moved, 'gw')?.conditionNodes?.map((b) => nodeKeyOf(b))).toEqual([
      'b2',
      'b1',
      'b3',
      'def',
    ]);

    // 默认分支自己右移/左移都不动。
    expect(findNode(moveBranch(root, 'gw', 'def', -1), 'gw')?.conditionNodes?.map((b) => nodeKeyOf(b))).toEqual([
      'b1',
      'b2',
      'b3',
      'def',
    ]);
    // 倒数第二条右移会撞上默认分支，整体不动。
    expect(findNode(moveBranch(root, 'gw', 'b3', 1), 'gw')?.conditionNodes?.map((b) => nodeKeyOf(b))).toEqual([
      'b1',
      'b2',
      'b3',
      'def',
    ]);
    // 第一条左移越界不动，原树引用原样返回。
    expect(moveBranch(root, 'gw', 'b1', -1)).toBe(root);
  });

  it('遍历与统计：walkNodes 覆盖分支、countNodes/treeDepth/chainTail 正确', () => {
    const root = node('root', NODE_TYPE.START, {
      childNode: gateway('gw', [
        {
          ...branch('b1'),
          childNode: node('deep', NODE_TYPE.COPY, {
            childNode: node('deeper', NODE_TYPE.END),
          }),
        },
        branch('def', true),
      ]),
    });
    const seen: string[] = [];
    walkNodes(root, (n) => seen.push(nodeKeyOf(n)));
    expect(seen).toEqual(['root', 'gw', 'b1', 'deep', 'deeper', 'def']);
    expect(countNodes(root)).toBe(6);
    expect(treeDepth(root)).toBe(5);
    expect(nodeKeyOf(chainTail(root))).toBe('gw');
  });

  it('hasWorkerNode 只认审批/办理节点', () => {
    const copyOnly = node('root', NODE_TYPE.START, {
      childNode: node('cc', NODE_TYPE.COPY),
    });
    expect(hasWorkerNode(copyOnly)).toBe(false);
    const withApprove = node('root', NODE_TYPE.START, {
      childNode: node('ap', NODE_TYPE.APPROVE),
    });
    expect(hasWorkerNode(withApprove)).toBe(true);
    const withTransact = node('root', NODE_TYPE.START, {
      childNode: node('tx', NODE_TYPE.TRANSACT),
    });
    expect(hasWorkerNode(withTransact)).toBe(true);
  });
});
