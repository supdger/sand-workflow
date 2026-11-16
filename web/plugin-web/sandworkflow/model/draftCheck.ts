import type { AssigneeRule, CcRule, FlowCondition, FlowNode, FlowWidget } from '../api/types';
import { ASSIGNEE_TYPE, NODE_TYPE } from '../api/types';
import type { DefinitionDraft } from './definitionCodec';
import {
  assigneeFields,
  hasInitiatorChoice,
  isDirectRule,
  memberIds,
  ruleTypeOf,
  SLOT_KEY_PATTERN,
} from './assignee';
import { isAllowedOperator } from './conditions';
import { isInitiatorType } from './initiators';
import { hasWorkerNode, treeDepth, walkNodes } from './nodeTree';
import { isDefaultBranch, nodeKeyOf, nodeTypeLabel } from './nodeTypes';

/**
 * 发布前本地预检（契约 §3.2 prepareDefinition 清单的镜像 + §9.2 前端必查）。
 * 处理人规则逐条、条件组、flowWidgets 重名、formAuths 一致性、发起范围、
 * choiceKey/relationKey 格式与全树唯一都在这里拦；issue 携带 nodeKey
 * 供画布定位选中。直通形态规则与未知节点类型按老数据对待，规则本身不报错，
 * 但未知节点类型整体是发布硬伤，报出来。
 */

export interface DraftIssue {
  /** 出问题的节点标识；表单/整体级问题没有节点归属。 */
  nodeKey?: string;
  /** 出问题的表单字段名；节点级问题没有字段归属。 */
  fieldName?: string;
  /** 节点名，用于文案展示。 */
  nodeName?: string;
  message: string;
}

export interface DraftReport {
  ok: boolean;
  issues: DraftIssue[];
}

/** 发布入参层面的上下文：流程名在页面 meta 里，不在草稿上。 */
export interface DraftCheckContext {
  name?: string;
}

const MAX_DEPTH = 100;
const NAME_MAX = 120;
const SUPPORTED_TYPES = new Set<number>([
  NODE_TYPE.START,
  NODE_TYPE.APPROVE,
  NODE_TYPE.COPY,
  NODE_TYPE.CONDITION,
  NODE_TYPE.EXCLUSIVE_GATEWAY,
  NODE_TYPE.TRANSACT,
  NODE_TYPE.END,
]);

function nodeLabel(node: FlowNode): string {
  return node.name ?? nodeTypeLabel(node.type);
}

function truthy(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

/** flowWidgets 一级 + 明细子字段全部字段名（含查重）。 */
function collectWidgetNames(widgets: FlowWidget[], issues: DraftIssue[]): Set<string> {
  const names = new Set<string>();
  const visit = (widget: FlowWidget) => {
    const name = (widget.name ?? '').trim();
    if (name === '') {
      issues.push({ message: '表单里有字段名没填的控件' });
      return;
    }
    if (names.has(name)) {
      issues.push({ fieldName: name, message: `表单字段名重复：${name}` });
      return;
    }
    names.add(name);
    for (const child of widget.details ?? []) {
      visit(child);
    }
  };
  for (const widget of widgets) {
    visit(widget);
  }
  return names;
}

/** 全树收集 nodeId/choiceKey/relationKey 的唯一性校验数据。 */
interface KeyIndex {
  nodeIds: Map<string, FlowNode>;
  /** choiceKey 与 relationKey 共用一个查重池（后端全树互相查重）。 */
  slots: Map<string, FlowNode>;
}

function checkAssigneeRules(
  node: FlowNode,
  rules: AssigneeRule[],
  slotKeys: KeyIndex,
  issues: DraftIssue[],
): void {
  const key = nodeKeyOf(node);
  const name = nodeLabel(node);
  const nodeTypeName = node.type === NODE_TYPE.TRANSACT ? '办理' : '审批';
  const { membersKey } = assigneeFields(node.type);
  if (rules.length === 0) {
    issues.push({ nodeKey: key, nodeName: name, message: `「${name}」未配置${nodeTypeName}人规则` });
    return;
  }
  rules.forEach((rule, index) => {
    const ruleType = ruleTypeOf(rule);
    if (ruleType === undefined) {
      if (!isDirectRule(rule)) {
        issues.push({ nodeKey: key, nodeName: name, message: `「${name}」第 ${index + 1} 条规则没有类型` });
      }
      return;
    }
    const ruleName = `${name}」第 ${index + 1} 条规则`;
    switch (ruleType) {
      case ASSIGNEE_TYPE.SELF:
        break;
      case ASSIGNEE_TYPE.ROLE:
        if (!Array.isArray(rule.roles) || rule.roles.length === 0) {
          issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}选了指定角色但没选角色` });
        }
        break;
      case ASSIGNEE_TYPE.ASSIGNEE:
        if (memberIds(rule[membersKey] as AssigneeRule['assignees']).length === 0) {
          issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}选了指定成员但没选人` });
        }
        break;
      case ASSIGNEE_TYPE.DEPARTMENT_LEADER:
      case ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER: {
        const layerType = rule.layerType ?? 0;
        const layer = rule.layer ?? 0;
        if (layerType !== 0 && layerType !== 1) {
          issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}层级方向只能是 0 或 1` });
        }
        if (!Number.isInteger(layer) || layer < 0 || layer > 20) {
          issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}层数要在 0-20 之间` });
        }
        collectSlotKey(node, rule.relationKey, 'relationKey', slotKeys, issues);
        break;
      }
      case ASSIGNEE_TYPE.INITIATOR_CHOICE:
        collectSlotKey(node, rule.choiceKey, 'choiceKey', slotKeys, issues);
        break;
      case ASSIGNEE_TYPE.SUPERIOR:
      case ASSIGNEE_TYPE.MULTISTEP_LEADER:
        issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}的方式当前版本不支持` });
        break;
      default:
        issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}的方式(${ruleType})当前版本不支持` });
    }
  });

  const multi = node.multiInstanceApprovalType ?? 0;
  if (![0, 1, 2, 3].includes(multi)) {
    issues.push({ nodeKey: key, nodeName: name, message: `「${name}」多人处理方式只能是 0-3` });
  }
  if (hasInitiatorChoice(rules)) {
    if (rules.length > 1) {
      issues.push({ nodeKey: key, nodeName: name, message: `「${name}」发起人自选不能和其他规则混用` });
    }
    if (multi === 0) {
      issues.push({ nodeKey: key, nodeName: name, message: `「${name}」发起人自选不能配或签` });
    }
  }
  if (
    rules.some((rule) => ruleTypeOf(rule) === ASSIGNEE_TYPE.MULTISTEP_DEPARTMENT_LEADER) &&
    multi !== 3
  ) {
    issues.push({ nodeKey: key, nodeName: name, message: `「${name}」连续多级部门负责人必须配依次审批` });
  }
}

function checkCcRules(node: FlowNode, issues: DraftIssue[]): void {
  const key = nodeKeyOf(node);
  const name = nodeLabel(node);
  const rules = node.ccs ?? [];
  if (rules.length === 0) {
    issues.push({ nodeKey: key, nodeName: name, message: `「${name}」未配置抄送人规则` });
    return;
  }
  rules.forEach((rule: CcRule, index) => {
    const ruleName = `${name}」第 ${index + 1} 条抄送规则`;
    if (rule.ccType === undefined) {
      // 抄送的直通形态只放行 {id}（契约 §2.5）；其余无类型形态不支持。
      if (rule.id === undefined || isDirectRule(rule) === false) {
        issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}的方式当前版本不支持` });
      }
      return;
    }
    switch (rule.ccType) {
      case ASSIGNEE_TYPE.SELF:
        break;
      case ASSIGNEE_TYPE.ROLE:
        if (!Array.isArray(rule.roles) || rule.roles.length === 0) {
          issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}选了指定角色但没选角色` });
        }
        break;
      case ASSIGNEE_TYPE.ASSIGNEE:
        if (memberIds(rule.assignees).length === 0) {
          issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}选了指定成员但没选人` });
        }
        break;
      default:
        issues.push({ nodeKey: key, nodeName: name, message: `「${ruleName}的方式当前版本不支持` });
    }
  });
}

function collectSlotKey(
  node: FlowNode,
  value: unknown,
  field: 'choiceKey' | 'relationKey',
  keyIndex: KeyIndex,
  issues: DraftIssue[],
): void {
  // 缺省由后端发布补发，不查；自产的要过格式 + 全树唯一。
  if (value === undefined || value === null) {
    return;
  }
  const text = String(value);
  const name = nodeLabel(node);
  if (!SLOT_KEY_PATTERN.test(text)) {
    issues.push({
      nodeKey: nodeKeyOf(node),
      nodeName: name,
      message: `「${name}」的 ${field}「${text}」格式不对（字母开头，字母/数字/下划线，≤64 位）`,
    });
    return;
  }
  const holder = keyIndex.slots.get(text);
  if (holder) {
    issues.push({
      nodeKey: nodeKeyOf(node),
      nodeName: name,
      message: `「${name}」的 ${field}「${text}」和「${nodeLabel(holder)}」重复了`,
    });
    return;
  }
  keyIndex.slots.set(text, node);
}

function checkConditions(node: FlowNode, widgetNames: Set<string>, issues: DraftIssue[]): void {
  const name = nodeLabel(node);
  const groups = node.conditionGroups ?? [];
  if (groups.length === 0) {
    issues.push({
      nodeKey: nodeKeyOf(node),
      nodeName: name,
      message: `非默认分支「${name}」至少要有一个条件组`,
    });
    return;
  }
  groups.forEach((group, groupIndex) => {
    const conditions = group.conditions ?? [];
    if (conditions.length === 0) {
      issues.push({
        nodeKey: nodeKeyOf(node),
        nodeName: name,
        message: `「${name}」第 ${groupIndex + 1} 个条件组是空的`,
      });
      return;
    }
    conditions.forEach((condition: FlowCondition, index) => {
      const where = `${name}」条件组 ${groupIndex + 1} 第 ${index + 1} 条`;
      if (condition.varName === undefined || String(condition.varName).trim() === '') {
        issues.push({ nodeKey: nodeKeyOf(node), nodeName: name, message: `「${where}没选字段` });
      } else if (!widgetNames.has(String(condition.varName))) {
        issues.push({
          nodeKey: nodeKeyOf(node),
          nodeName: name,
          message: `「${where}引用的字段「${condition.varName}」表单里不存在，条件永远不成立`,
        });
      }
      if (!isAllowedOperator(condition.operator)) {
        issues.push({
          nodeKey: nodeKeyOf(node),
          nodeName: name,
          message: `「${where}的操作符(${condition.operator ?? '空'})不支持`,
        });
      }
    });
  });
}

function checkGateway(gateway: FlowNode, widgetNames: Set<string>, issues: DraftIssue[]): void {
  const branches = gateway.conditionNodes ?? [];
  const gatewayName = nodeLabel(gateway);
  if (branches.length < 2) {
    issues.push({ nodeKey: nodeKeyOf(gateway), nodeName: gatewayName, message: `「${gatewayName}」分支不够两条` });
    return;
  }
  const last = branches[branches.length - 1];
  for (let index = 0; index < branches.length; index += 1) {
    const branch = branches[index];
    if (!branch) {
      continue;
    }
    const branchName = branch.name ?? `分支${index + 1}`;
    if (isDefaultBranch(branch)) {
      if (branch !== last) {
        issues.push({
          nodeKey: nodeKeyOf(branch),
          nodeName: branchName,
          message: `默认分支「${branchName}」必须排在最后`,
        });
      }
    } else {
      checkConditions(branch, widgetNames, issues);
    }
  }
}

/** 收集全树被条件引用的字段名：这些字段任何节点都不可配 editable。 */
export function collectConditionVars(root: FlowNode): Set<string> {
  const names = new Set<string>();
  walkNodes(root, (node) => {
    for (const group of node.conditionGroups ?? []) {
      for (const condition of group.conditions ?? []) {
        if (condition.varName !== undefined && String(condition.varName).trim() !== '') {
          names.add(String(condition.varName));
        }
      }
    }
  });
  return names;
}

function checkFormAuths(
  node: FlowNode,
  widgetMap: Map<string, FlowWidget>,
  conditionVars: Set<string>,
  issues: DraftIssue[],
): void {
  const name = nodeLabel(node);
  const seen = new Set<string>();
  for (const entry of node.formAuths ?? []) {
    const widget = widgetMap.get(entry.name);
    if (!widget) {
      issues.push({
        nodeKey: nodeKeyOf(node),
        nodeName: name,
        message: `「${name}」字段权限里的「${entry.name}」不是表单一级字段`,
      });
      continue;
    }
    if (seen.has(entry.name)) {
      issues.push({
        nodeKey: nodeKeyOf(node),
        nodeName: name,
        message: `「${name}」字段权限里「${entry.name}」重复了`,
      });
      continue;
    }
    seen.add(entry.name);

    const entries = widget.type === 9 ? (entry.details ?? []) : [entry];
    const detailNames = new Set((widget.details ?? []).map((child) => child.name));
    for (const item of entries) {
      if (widget.type === 9 && !detailNames.has(item.name)) {
        issues.push({
          nodeKey: nodeKeyOf(node),
          nodeName: name,
          message: `「${name}」明细「${entry.name}」下没有子字段「${item.name}」`,
        });
        continue;
      }
      if (truthy(item.editable) && !truthy(item.readable)) {
        issues.push({
          nodeKey: nodeKeyOf(node),
          nodeName: name,
          message: `「${name}」字段「${item.name}」可编辑必须先可读`,
        });
      }
      if (truthy(item.editable) && widget.type === 23) {
        issues.push({
          nodeKey: nodeKeyOf(node),
          nodeName: name,
          message: `「${name}」公式字段「${item.name}」不能配可编辑`,
        });
      }
      if (truthy(item.editable) && conditionVars.has(item.name)) {
        issues.push({
          nodeKey: nodeKeyOf(node),
          nodeName: name,
          message: `「${name}」字段「${item.name}」被条件引用，不能配可编辑`,
        });
      }
    }
  }
}

export function checkDraft(draft: DefinitionDraft, context?: DraftCheckContext): DraftReport {
  const issues: DraftIssue[] = [];
  const root = draft.nodeConfig;

  if (context?.name !== undefined) {
    const trimmed = context.name.trim();
    if (trimmed === '') {
      issues.push({ message: '流程名称没填' });
    } else if (trimmed.length > NAME_MAX) {
      issues.push({ message: `流程名称最多 ${NAME_MAX} 个字` });
    }
  }

  if (root.type !== NODE_TYPE.START) {
    issues.push({ nodeKey: nodeKeyOf(root), message: '流程必须从发起节点开始' });
  }
  if (!hasWorkerNode(root)) {
    issues.push({ message: '流程里至少需要一个审批或办理节点' });
  }
  if (treeDepth(root) > MAX_DEPTH) {
    issues.push({ message: `节点树超过 ${MAX_DEPTH} 层` });
  }

  const widgetNames = collectWidgetNames(draft.flowWidgets, issues);
  const widgetMap = new Map(draft.flowWidgets.map((widget) => [widget.name, widget]));
  const conditionVars = collectConditionVars(root);
  const keyIndex: KeyIndex = { nodeIds: new Map(), slots: new Map() };

  walkNodes(root, (node, parent) => {
    const name = nodeLabel(node);
    if (parent === null && node.type !== NODE_TYPE.START) {
      issues.push({ nodeKey: nodeKeyOf(node), message: '流程必须从发起节点开始' });
    }
    if (!SUPPORTED_TYPES.has(node.type)) {
      issues.push({
        nodeKey: nodeKeyOf(node),
        nodeName: name,
        message: `「${name}」的节点类型(${node.type})当前版本不支持`,
      });
      return;
    }
    if (typeof node.nodeId === 'string' && node.nodeId !== '') {
      const holder = keyIndex.nodeIds.get(node.nodeId);
      if (holder) {
        issues.push({
          nodeKey: nodeKeyOf(node),
          nodeName: name,
          message: `「${name}」的 nodeId「${node.nodeId}」和「${nodeLabel(holder)}」重复了`,
        });
      } else {
        keyIndex.nodeIds.set(node.nodeId, node);
      }
    }

    switch (node.type) {
      case NODE_TYPE.APPROVE:
      case NODE_TYPE.TRANSACT: {
        const { rulesKey } = assigneeFields(node.type);
        checkAssigneeRules(
          node,
          (node[rulesKey] as AssigneeRule[] | undefined) ?? [],
          keyIndex,
          issues,
        );
        checkFormAuths(node, widgetMap, conditionVars, issues);
        break;
      }
      case NODE_TYPE.COPY:
        checkCcRules(node, issues);
        checkFormAuths(node, widgetMap, conditionVars, issues);
        break;
      case NODE_TYPE.EXCLUSIVE_GATEWAY:
        checkGateway(node, widgetNames, issues);
        break;
      default:
        break;
    }
  });

  const permissionType = draft.flowPermission?.type;
  const initiators = draft.flowPermission?.flowInitiators;
  if (permissionType === 2) {
    if (!Array.isArray(initiators) || initiators.length === 0) {
      issues.push({ message: '发起范围选了指定范围但一个条目都没配，这样谁都发不起' });
    } else {
      for (const item of initiators) {
        if (!isInitiatorType(String(item.type))) {
          issues.push({ message: `发起范围条目类型「${String(item.type)}」不认识（只认 user/dept/role）` });
        }
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
