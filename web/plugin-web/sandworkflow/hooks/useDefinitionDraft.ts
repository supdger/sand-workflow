import { useReducer } from 'react';

import type { FlowNode, FlowPermission, FlowWidget, WorkFlowDef } from '../api/types';
import type { DefinitionDraft } from '../model/definitionCodec';
import { addBranch, insertAfter, moveBranch, removeBranch, removeNode, updateNode } from '../model/nodeTree';

/**
 * 设计器编辑态：4 键草稿由 useReducer 集中持有，节点树的每次改动都经过
 * model 层纯函数产出新树，组件不直接摸树（ADR-4）。
 * 撤销重做快照栈在后续工作包补（useEditHistory）。
 */

export type DraftAction =
  | { type: 'reset'; draft: DefinitionDraft }
  | { type: 'insertNode'; afterKey: string; node: FlowNode }
  | { type: 'removeNode'; nodeKey: string }
  | { type: 'updateNode'; nodeKey: string; patch: Partial<FlowNode> }
  | { type: 'addBranch'; gatewayKey: string; branch: FlowNode }
  | { type: 'removeBranch'; gatewayKey: string; branchKey: string }
  | { type: 'moveBranch'; gatewayKey: string; branchKey: string; offset: number }
  | { type: 'setWorkFlowDef'; workFlowDef: WorkFlowDef }
  | { type: 'setWidgets'; flowWidgets: FlowWidget[] }
  | { type: 'setPermission'; flowPermission: FlowPermission };

function draftReducer(draft: DefinitionDraft, action: DraftAction): DefinitionDraft {
  switch (action.type) {
    case 'reset':
      return action.draft;
    case 'insertNode':
      return { ...draft, nodeConfig: insertAfter(draft.nodeConfig, action.afterKey, action.node) };
    case 'removeNode':
      return { ...draft, nodeConfig: removeNode(draft.nodeConfig, action.nodeKey) };
    case 'updateNode':
      return { ...draft, nodeConfig: updateNode(draft.nodeConfig, action.nodeKey, action.patch) };
    case 'addBranch':
      return { ...draft, nodeConfig: addBranch(draft.nodeConfig, action.gatewayKey, action.branch) };
    case 'removeBranch':
      return {
        ...draft,
        nodeConfig: removeBranch(draft.nodeConfig, action.gatewayKey, action.branchKey),
      };
    case 'moveBranch':
      return {
        ...draft,
        nodeConfig: moveBranch(draft.nodeConfig, action.gatewayKey, action.branchKey, action.offset),
      };
    case 'setWorkFlowDef':
      return { ...draft, workFlowDef: action.workFlowDef };
    case 'setWidgets':
      return { ...draft, flowWidgets: action.flowWidgets };
    case 'setPermission':
      return { ...draft, flowPermission: action.flowPermission };
    default:
      return draft;
  }
}

export function useDefinitionDraft(initial: DefinitionDraft) {
  const [draft, dispatch] = useReducer(draftReducer, initial);
  return { draft, dispatch };
}
