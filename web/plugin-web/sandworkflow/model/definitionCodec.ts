import type { DefinitionJson, FlowNode, FlowPermission, FlowWidget, WorkFlowDef } from '../api/types';
import { createRootNode, genEditorKey } from './nodeTypes';

/**
 * definition_json 的「读 → 编辑态 → 写回」编解码。
 * 读入逐键容错：老数据缺哪个键就补哪个默认值，已有键（含后端补发的
 * id/nodeId/choiceKey/relationKey、直通规则、未知类型节点、顶层多余键）
 * 一律原样随行不丢。
 * 写回只剥编辑器临时键，其余原样交回，保证引擎能继续消费。
 */

/** 编辑态草稿：4 个键都保证存在，其余顶层键透传。 */
export interface DefinitionDraft extends DefinitionJson {
  workFlowDef: WorkFlowDef;
  flowWidgets: FlowWidget[];
  nodeConfig: FlowNode;
  flowPermission: FlowPermission;
}

/** 编辑器临时态键：发出去之前必须剥净。 */
const EDITOR_KEYS = new Set(['__editorKey', 'focus', 'error']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createDraft(): DefinitionDraft {
  return {
    workFlowDef: {},
    flowWidgets: [],
    nodeConfig: createRootNode(),
    flowPermission: { type: 1, flowInitiators: [] },
  };
}

/** 控件（含明细子字段）也补编辑键，给表单设计器做选中态与 React key。 */
function assignWidgetKeys(widget: FlowWidget): FlowWidget {
  const next: FlowWidget =
    typeof widget.__editorKey === 'string' ? widget : { ...widget, __editorKey: genEditorKey() };
  if (Array.isArray(next.details)) {
    next.details = next.details.map(assignWidgetKeys);
  }
  return next;
}

/** 给整棵节点树补编辑键；已有 __editorKey 的不动，保证选中态稳定。 */
function assignEditorKeys(node: FlowNode): FlowNode {
  const next: FlowNode =
    typeof node.__editorKey === 'string' ? node : { ...node, __editorKey: genEditorKey() };
  if (next.childNode) {
    next.childNode = assignEditorKeys(next.childNode);
  }
  if (next.conditionNodes) {
    next.conditionNodes = next.conditionNodes.map(assignEditorKeys);
  }
  return next;
}

/**
 * 读入 definition_json（对象或 JSON 字符串）生成编辑草稿。
 * nodeConfig 缺失或不是对象时回退为单个发起节点；根节点 type 不是 0 的
 * 老数据也照常载入——画布能渲染、发布前校验会拦住，不在载入时丢数据。
 */
export function loadDefinition(input: DefinitionJson | string | null | undefined): DefinitionDraft {
  let source: unknown = input;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }
  const json: DefinitionJson = isRecord(source) ? (source as DefinitionJson) : {};
  const { workFlowDef, flowWidgets, nodeConfig, flowPermission, ...rest } = json;

  return {
    ...rest,
    workFlowDef: isRecord(workFlowDef) ? workFlowDef : {},
    flowWidgets: Array.isArray(flowWidgets) ? flowWidgets.map(assignWidgetKeys) : [],
    nodeConfig: isRecord(nodeConfig) ? assignEditorKeys(nodeConfig as FlowNode) : createRootNode(),
    flowPermission: isRecord(flowPermission)
      ? flowPermission
      : { type: 1, flowInitiators: [] },
  };
}

function stripEditorKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripEditorKeys);
  }
  if (isRecord(value)) {
    const clean: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (!EDITOR_KEYS.has(key)) {
        clean[key] = stripEditorKeys(item);
      }
    }
    return clean;
  }
  return value;
}

/** 写回定义载荷：剥掉全部编辑器临时键，其余字段原样保留。 */
export function serializeDraft(draft: DefinitionDraft): DefinitionJson {
  return stripEditorKeys(draft) as DefinitionJson;
}
